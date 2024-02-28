import { fastify, FastifyServerOptions } from 'fastify';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import fastifyHelmet from '@fastify/helmet';

import { logger, genReqIdFunctionCreator } from './utils/logger';
import { createContext, appRouter } from '@cyan/tw-erp-punch-trpc';

export const buildApp = (opts: FastifyServerOptions = {}) => {
  const appOptions: FastifyServerOptions = {
    /* pino logger */
    logger,
    /* generate request id for each request, uuid or serial number string */
    genReqId: genReqIdFunctionCreator(),
    ...opts,
  };
  const app = fastify(appOptions);
  /* plugins here */
  app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    global: true,
  });
  /* tRPC goes here */
  app.register(fastifyTRPCPlugin<typeof appRouter>, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ error, type, path, req }) {
        req.log.error(error, `${path}.${type}`);
      },
    },
  });
  return app;
};
