import { z } from 'zod';
import {
  punchRecordCreateSchema,
  punchModificationCreateSchema,
  PunchModificationRequest,
  punchModificationUpdateSchema,
  upsertPunchRecordSchema,
  punchRecordTypeSchema,
} from '@cyan/tw-erp-db';
import { router, publicProcedure, privateProcedure } from '../trpc/trpc';
import { eq, and, between } from 'drizzle-orm';
import { omit } from 'lodash';
import dayjs from 'dayjs';

export const punchProcedures = router({
  punch: privateProcedure(['admin', 'worker'])
    .input(punchRecordCreateSchema)
    .output(z.object({ message: z.string() }))
    .mutation(
      async ({ ctx: { logger, orm, tbs, reqSender }, input: { type } }) => {
        try {
          await orm.insert(tbs.punchRecord).values({
            userNumber: reqSender.userNumber,
            type: type,
          });
          return { message: 'success' };
        } catch (err) {
          logger.error({ type, reqSender, err }, 'Unable to punch.');
          throw err;
        }
      },
    ),
  updatePunch: privateProcedure(['admin', 'worker'])
    .input(z.object({ id: z.number() }))
    .output(z.object({ message: z.string() }))
    .mutation(
      async ({ ctx: { logger, orm, tbs, reqSender }, input: { id } }) => {
        try {
          await orm
            .update(tbs.punchRecord)
            .set({
              timestamp: new Date().toISOString(),
            })
            .where(eq(tbs.punchRecord.userNumber, reqSender.userNumber));
          return { message: 'success' };
        } catch (err) {
          logger.error({ id, reqSender, err }, 'Unable to update punch.');
          throw err;
        }
      },
    ),
  getPunches: publicProcedure
    .input(
      z
        .object({
          range: z.object({
            from: z.string(),
            to: z.string(),
          }),
          userNumber: z.number(),
        })
        .partial(),
    )
    .query(async ({ ctx: { logger, orm }, input: { range, userNumber } }) => {
      // console.log(dayjs().utc().utcOffset(8).startOf('D').toDate());
      try {
        const punches = await orm.query.punchRecord.findMany({
          where: (p, { and, between, eq }) =>
            and(
              ...(range ? [between(p.timestamp, range.from, range.to)] : []),
              ...(userNumber != null ? [eq(p.userNumber, userNumber)] : []),
            ),
        });
        return punches;
      } catch (err) {
        logger.error({ err }, 'Unable to get punches.');
        throw err;
      }
    }),
  requestPunchModification: privateProcedure(['admin', 'worker'])
    .input(punchModificationCreateSchema)
    .mutation(async ({ ctx: { logger, orm, reqSender, tbs }, input }) => {
      try {
        await orm.insert(tbs.punchModification).values({
          ...input,
          request: input.request as PunchModificationRequest,
          requestor: reqSender.userNumber,
        });
      } catch (err) {
        logger.error(
          { err, reqSender },
          'Unable to request punch modification.',
        );
        throw err;
      }
    }),
  getPunchModifications: privateProcedure(['admin', 'worker'])
    .input(
      z
        .object({
          range: z.object({
            from: z.string(),
            to: z.string(),
          }),
          requestor: z.number(),
        })
        .partial(),
    )
    .query(
      async ({
        ctx: { logger, orm, reqSender },
        input: { range, requestor },
      }) => {
        try {
          const punchModifications = await orm.query.punchModification.findMany(
            {
              where: (p, { and, between, eq }) =>
                and(
                  ...(range
                    ? [
                        between(
                          p.createdAt,
                          new Date(range.from),
                          new Date(range.to),
                        ),
                      ]
                    : []),
                  ...(reqSender.role !== 'admin'
                    ? [eq(p.requestor, reqSender.userNumber)]
                    : requestor != null
                      ? [eq(p.requestor, requestor)]
                      : []),
                ),
            },
          );
          return punchModifications;
        } catch (err) {
          logger.error(
            { err, reqSender, range, userNumber: requestor },
            'Unable to get punch modifications.',
          );
          throw err;
        }
      },
    ),
  updatePunchModification: privateProcedure(['admin', 'worker'])
    .input(punchModificationUpdateSchema)
    .mutation(async ({ ctx: { logger, orm, reqSender, tbs }, input }) => {
      try {
        await orm
          .update(tbs.punchModification)
          .set({
            ...omit(input, ['id']),
            request: input.request as PunchModificationRequest,
            requestor: reqSender.userNumber,
          })
          .where(eq(tbs.punchModification.id, input.id));
      } catch (err) {
        logger.error(
          { err, reqSender },
          'Unable to update punch modification.',
        );
        throw err;
      }
    }),
  approvePunchModification: privateProcedure(['admin'])
    .input(z.object({ id: z.number() }))
    .mutation(
      async ({ ctx: { logger, orm, reqSender, tbs }, input: { id } }) => {
        try {
          const punchModification = await orm.query.punchModification.findFirst(
            { where: (pm, { eq }) => eq(pm.id, id) },
          );
          if (!punchModification) {
            const msg = 'Punch Modification not found';
            logger.error({ id }, msg);
            throw new Error(msg);
          }
          const { request, requestor } = punchModification;
          /* Upsert related punches */
          await Promise.all(
            Object.entries(request)
              .filter(([_, dateString]) => dateString != null)
              .map(async ([type, dateString]) => {
                const parsedType = punchRecordTypeSchema.parse(type);
                const date = dayjs(dateString);
                if (dateString !== '') {
                  /* Modify or Insert */
                  const updates = {
                    userNumber: requestor,
                    timestamp: date.toISOString(),
                    type: parsedType,
                  };
                  const record = await orm.query.punchRecord.findFirst({
                    where: (pr, { between, and, eq }) =>
                      and(
                        between(
                          pr.timestamp,
                          date.utc().utcOffset(8).startOf('d').toISOString(),
                          date.utc().utcOffset(8).endOf('d').toISOString(),
                        ),
                        eq(pr.type, parsedType),
                        eq(pr.userNumber, requestor),
                      ),
                  });
                  if (record) {
                    logger.info(
                      { type, dateString, requestor, request },
                      'Update punch.',
                    );
                    await orm
                      .update(tbs.punchRecord)
                      .set(updates)
                      .where(eq(tbs.punchRecord.id, record.id));
                  } else {
                    logger.info(
                      { type, dateString, requestor, request },
                      'Insert punch.',
                    );
                    await orm.insert(tbs.punchRecord).values({
                      userNumber: requestor,
                      timestamp: dateString,
                      type: parsedType,
                    });
                  }
                } else {
                  logger.info(
                    { type, dateString, requestor, request },
                    'Delete punch.',
                  );
                  /* Delete */
                  await orm
                    .delete(tbs.punchRecord)
                    .where(
                      and(
                        between(
                          tbs.punchRecord.timestamp,
                          date.utc().utcOffset(8).startOf('d').toISOString(),
                          date.utc().utcOffset(8).endOf('d').toISOString(),
                        ),
                        eq(tbs.punchRecord.type, parsedType),
                        eq(tbs.punchRecord.userNumber, requestor),
                      ),
                    );
                }
              }),
          );

          /* Set approved */
          await orm
            .update(tbs.punchModification)
            .set({ isApproved: true })
            .where(eq(tbs.punchModification.id, id));
        } catch (err) {
          logger.error(
            { err, reqSender },
            'Unable to approve punch modification.',
          );
          throw err;
        }
      },
    ),
  deletePunchModification: privateProcedure(['admin', 'worker'])
    .input(z.object({ id: z.number() }))
    .mutation(
      async ({ ctx: { logger, orm, reqSender, tbs }, input: { id } }) => {
        try {
          await orm
            .delete(tbs.punchModification)
            .where(
              and(
                eq(tbs.punchModification.id, id),
                ...(reqSender.role === 'admin'
                  ? []
                  : [
                      eq(tbs.punchModification.requestor, reqSender.userNumber),
                    ]),
              ),
            );
        } catch (err) {
          logger.error(
            { err, reqSender },
            'Unable to delete punch modification.',
          );
          throw err;
        }
      },
    ),
  upsertPunch: privateProcedure(['admin'])
    .input(upsertPunchRecordSchema)
    .mutation(async ({ ctx: { logger, orm, reqSender, tbs }, input }) => {
      try {
        await orm
          .insert(tbs.punchRecord)
          .values(input)
          .onConflictDoUpdate({
            set: { ...omit(input, ['id']) },
            target: tbs.punchRecord.id,
          });
      } catch (err) {
        logger.error({ err, reqSender, input }, 'Unable to upsert punch.');
        throw err;
      }
    }),
  deletePunch: privateProcedure(['admin'])
    .input(z.object({ id: z.number() }))
    .mutation(
      async ({ ctx: { logger, orm, reqSender, tbs }, input: { id } }) => {
        try {
          await orm.delete(tbs.punchRecord).where(eq(tbs.punchRecord.id, id));
        } catch (err) {
          logger.error({ err, reqSender, id }, 'Unable to delete punch.');
          throw err;
        }
      },
    ),
});
