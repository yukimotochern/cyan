import { authProcedures } from '../features/auth.procedure';
import { punchProcedures } from '../features/punch.procedure';
import { userProcedures } from '../features/user.procedure';
import { router } from './trpc';

export const appRouter = router({
  user: userProcedures,
  punch: punchProcedures,
  auth: authProcedures,
});

export type AppRouter = typeof appRouter;
