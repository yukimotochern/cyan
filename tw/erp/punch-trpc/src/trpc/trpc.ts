import { TRPCError, initTRPC } from '@trpc/server';
import { UserRole } from '@cyan/tw-erp-db';
import { Context } from './context';
const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;
export const privateProcedure = (allowedRoles: UserRole[]) =>
  t.procedure.use(async ({ ctx: { fastifyReq, orm }, next }) => {
    const auth = fastifyReq.headers['authorization'];
    const tokenMatch = /Bearer (?<token>.+)/.exec(auth || '');
    if (
      !tokenMatch ||
      !tokenMatch.groups ||
      typeof tokenMatch.groups['token'] !== 'string'
    ) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }
    const token = tokenMatch.groups['token'];
    const session = await orm.query.session.findFirst({
      where: (session, { eq }) => eq(session.id, token),
      with: {
        user: true,
      },
    });
    if (
      !session ||
      session.expiresAt < new Date() ||
      !session.user ||
      !allowedRoles.includes(session.user.role)
    ) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }
    const { userNumber, role, profile } = session.user;
    return next({
      ctx: {
        reqSender: { userNumber, role, profile },
      },
    });
  });

export const middleware = t.middleware;
