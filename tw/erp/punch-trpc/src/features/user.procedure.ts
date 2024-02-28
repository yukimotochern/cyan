import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, privateProcedure } from '../trpc/trpc';
import {
  userInsertSchema,
  userSelectSchema,
  UserProfile,
} from '@cyan/tw-erp-db';
import { TRPCError } from '@trpc/server';

export const userProcedures = router({
  createUser: privateProcedure(['admin'])
    .input(userInsertSchema)
    .output(z.object({ message: z.string() }))
    .mutation(async ({ ctx: { logger, orm, tbs }, input }) => {
      try {
        await orm
          .insert(tbs.user)
          .values({ ...input, profile: input.profile as UserProfile });
      } catch (err) {
        logger.error({ input, err }, 'Unable to create user');
        throw err;
      }
      return { message: 'success' };
    }),
  updateUser: privateProcedure(['admin'])
    .input(userInsertSchema.partial().required({ userNumber: true }))
    .output(userSelectSchema)
    .mutation(async ({ ctx: { logger, orm, tbs, reqSender }, input }) => {
      try {
        const user = await orm
          .update(tbs.user)
          .set({ ...input, profile: input.profile as UserProfile })
          .where(eq(tbs.user.userNumber, input.userNumber))
          .returning();
        if (user.length !== 1) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return user[0];
      } catch (err) {
        logger.error({ input, reqSender, err }, 'Unable to update user.');
        throw err;
      }
    }),
  deleteUser: privateProcedure(['admin'])
    .input(z.object({ userNumber: z.number() }))
    .output(z.object({ message: z.string() }))
    .mutation(
      async ({
        ctx: { logger, orm, tbs, reqSender },
        input: { userNumber },
      }) => {
        try {
          await orm.delete(tbs.user).where(eq(tbs.user.userNumber, userNumber));
          return { message: 'success' };
        } catch (err) {
          logger.error(
            { userNumber, reqSender, err },
            'Unable to delete user.',
          );
          throw err;
        }
      },
    ),
  getUsers: privateProcedure(['admin'])
    .output(z.array(userSelectSchema))
    .query(async ({ ctx: { logger, orm, tbs, reqSender } }) => {
      try {
        const users = await orm.select().from(tbs.user);
        return users;
      } catch (err) {
        logger.error({ reqSender, err }, 'Unable to get users.');
        throw err;
      }
    }),
});
