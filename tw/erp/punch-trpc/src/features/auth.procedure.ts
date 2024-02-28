import { z } from 'zod';
import { publicProcedure, router, privateProcedure } from '../trpc/trpc';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { lt, eq, and } from 'drizzle-orm';

export const authProcedures = router({
  login: publicProcedure
    .input(
      z.object({
        userNumber: z.number(),
        password: z.string(),
      }),
    )
    .output(
      z.object({
        token: z.string(),
      }),
    )
    .mutation(
      async ({
        ctx: { logger, orm, tbs },
        input: { userNumber, password },
      }) => {
        try {
          /* Match Credentials */
          const user = await orm.query.user.findFirst({
            where: (u, { eq, and }) =>
              and(eq(u.userNumber, userNumber), eq(u.password, password)),
          });
          if (!user) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
            });
          }
          /* Delete expired sessions */
          try {
            await orm
              .delete(tbs.session)
              .where(lt(tbs.session.expiresAt, new Date()));
          } catch (err) {
            logger.warn(
              { userNumber, err },
              'Unable to delete expired sessions.',
            );
          }
          /* Create Session */
          const [session] = await orm
            .insert(tbs.session)
            .values({
              userNumber,
              id: randomUUID(),
              expiresAt: dayjs().add(14, 'days').toDate(),
            })
            .returning();
          if (!session) {
            throw new Error('Unable to create session for user.');
          }
          return { token: session.id };
        } catch (err) {
          logger.error({ userNumber: userNumber, err }, 'Unable to login.');
          throw err;
        }
      },
    ),
  logout: privateProcedure(['worker', 'admin'])
    .input(z.object({ token: z.string() }))
    .output(z.object({ message: z.string() }))
    .mutation(
      async ({ ctx: { logger, orm, tbs, reqSender }, input: { token } }) => {
        try {
          const deletedSession = await orm
            .delete(tbs.session)
            .where(eq(tbs.session.id, token))
            .returning();
          if (deletedSession.length !== 1) {
            const msg = `Unexpected number of session delete`;
            logger.error({ deletedSession, reqSender, token }, msg);
            throw new Error(msg);
          }
          return {
            message: `${token} deleted.`,
          };
        } catch (err) {
          logger.error({ reqSender, token, err }, 'Unable to logout.');
          throw err;
        }
      },
    ),
  changePassword: publicProcedure
    .input(
      z.object({
        userNumber: z.number(),
        oldPassword: z.string(),
        newPassword: z.string(),
      }),
    )
    .output(z.object({ message: z.string() }))
    .mutation(
      async ({
        ctx: { logger, orm, tbs },
        input: { userNumber, oldPassword, newPassword },
      }) => {
        try {
          const updatedUsers = await orm
            .update(tbs.user)
            .set({
              password: newPassword,
            })
            .where(
              and(
                eq(tbs.user.userNumber, userNumber),
                eq(tbs.user.password, oldPassword),
              ),
            )
            .returning();
          if (updatedUsers.length !== 1) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid Credentials',
            });
          }
          return { message: 'success' };
        } catch (err) {
          logger.error({ err, userNumber }, 'Unable to change password');
          throw err;
        }
      },
    ),
});
