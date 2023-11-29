import { router } from './trpc';
import { exampleRouter } from './features/test/test';

export const appRouter = router({
  exampleRouter,
});

export type AppRouter = typeof appRouter;
