import { randomUUID } from 'crypto';
import { FastifyServerOptions } from 'fastify';
import pino from 'pino';
import pinoCaller from 'pino-caller';

const isDev = process.env['NODE_ENV'] !== 'production';

export const logger = pinoCaller(
  pino({
    level: 'trace',
    ...(isDev && {
      transport: {
        target: 'pino-pretty',
        options: {
          ignore:
            'pid,hostname,time,caller,response(Time,req.hostname,req.remoteAddress,req.remotePort,req.headers.host,req.headers.user-agent,req.headers.accept,req.headers.cache-control,req.headers.postman-token,req.headers.accept-encoding,req.headers.connection,req.headers.accept-language,req.headers.referer,req.headers.sec-fetch-dest,req.headers.sec-fetch-mode,req.headers.sec-fetch-site,req.headers.content-type,req.headers.sec-ch-ua-mobile,req.headers.dnt,req.headers.sec-ch-ua-platform,req.headers.sec-ch-ua,req.headers.pragma,req.headers',
        },
      },
    }),
    serializers: {
      req(request) {
        return {
          query: `${request.method}: ${decodeURI(request.url)}`,
          headers: request.headers,
          hostname: request.hostname,
          remoteAddress: request.ip,
          remotePort: request.socket.remotePort,
        };
      },
    },
    formatters: {
      log(ob) {
        if (typeof ob['caller'] !== 'string') return ob;
        let logLocation = ob['caller'];
        if (logLocation.includes('node_module')) return ob;
        logLocation = ['Object.<anonymous>', 'Object.handler'].reduce(
          (pre, curr) => pre.replace(curr, '').trim(),
          logLocation,
        );

        return {
          ...ob,
          logLocation,
        };
      },
    },
  }),
  {
    relativeTo: __dirname,
  },
);

export const genReqIdFunctionCreator: () => FastifyServerOptions['genReqId'] =
  () => {
    let initialRequestId = 0;
    return () => (isDev ? String(initialRequestId++) : randomUUID());
  };
