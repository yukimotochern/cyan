import { z } from 'zod';
import { eq } from 'drizzle-orm';

import {
  router,
  protectedProcedure,
  publicProcedure,
} from '../../../server/trpc';
import { testData } from '@cyan/indie-card-game-db';

export const exampleRouter = router({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}~`,
      };
    }),

  getAll: publicProcedure
    .input(z.object({ a: z.number() }))
    .query(({ ctx }) => {
      return ctx.orm.query.users.findMany();
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return 'you can now see this secret message!';
  }),
  getSecretTestData: protectedProcedure
    .input(
      z.object({
        prefix: z.string(),
      }),
    )
    .query(async ({ ctx: { orm } }) => {
      const data = await orm.query.testData.findMany();
      return data;
    }),
  getTestData: publicProcedure.query(async ({ ctx: { orm } }) => {
    const data = await orm.query.testData.findMany();
    return data;
  }),
  createTestData: protectedProcedure
    .input(
      z.object({
        data: z.string(),
      }),
    )
    .mutation(async ({ ctx: { orm, session }, input: { data } }) => {
      await orm.insert(testData).values({
        id: Math.random().toString(),
        data: session.user.email + ': ' + data,
      });
    }),
  updateTestData: protectedProcedure
    .input(
      z.object({
        data: z.string(),
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx: { orm, session }, input: { data, id } }) => {
      await orm
        .update(testData)
        .set({
          data: session.user.email + ': ' + data,
        })
        .where(eq(testData.id, id));
    }),
});
