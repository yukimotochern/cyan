import { httpBatchLink, loggerLink } from '@trpc/client';
import { createTRPCNext } from '@trpc/next';
import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server';
import superjson from 'superjson';

import { type AppRouter } from '../server/root';

export const getBaseUrl = () => {
  if (typeof window !== 'undefined') return ''; // browser should use relative url
  if (process.env.RUN_TIME_BACKEND_URL) return process.env.RUN_TIME_BACKEND_URL; // SSR should use specified url
  return `http://localhost:${process.env.RUN_TIME_PORT ?? 4200}`; // dev SSR should use localhost
};

/**
 * To prevent TS2742, need to have declaration.
 * In a mono-repository the error TS2742 can show up when you are using a package that has not set a “main” property in its “package.json” file.
 * Sometimes it also happens that there is a “types” property which does not point to the correct typings.
 */
export const api: ReturnType<typeof createTRPCNext<AppRouter>> =
  createTRPCNext<AppRouter>({
    config(opts) {
      const { ctx } = opts;
      return {
        transformer: superjson,
        links: [
          loggerLink({
            enabled: (opts) =>
              process.env.NODE_ENV === 'development' ||
              (opts.direction === 'down' && opts.result instanceof Error),
          }),
          httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
            headers() {
              if (!ctx?.req?.headers) return {};
              // To use SSR properly, you need to forward client headers to the server
              // This is so you can pass through things like cookies when we're server-side rendering
              return {
                cookie: ctx.req.headers.cookie,
              };
            },
          }),
        ],
      };
    },
    ssr: true,
  });

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
