import { inferAsyncReturnType } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { orm } from '../services/db';
import * as tbs from '@cyan/tw-erp-db';

import { env } from '../env/env';

export function createContext({ req, res }: CreateFastifyContextOptions) {
  return {
    fastify: res.server,
    fastifyReq: req,
    fastifyRes: res,
    env,
    logger: req.log,
    orm,
    tbs,
  };
}
export type Context = inferAsyncReturnType<typeof createContext>;
