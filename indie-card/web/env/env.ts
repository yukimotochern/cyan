import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    // Database
    RUN_TIME_DATABASE_HOST: z.string().min(1),
    RUN_TIME_DATABASE_USER: z.string().min(1),
    RUN_TIME_DATABASE_DB_NAME: z.string().min(1),
    RUN_TIME_DATABASE_PASSWORD: z.string().min(1),
    RUN_TIME_DATABASE_PORT: z.coerce.number(),
    // Google
    RUN_TIME_GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
    RUN_TIME_GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
    // General
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    // Next Auth
    RUN_TIME_NEXTAUTH_SECRET:
      process.env.NODE_ENV === 'production'
        ? z.string().min(1)
        : z.string().min(1).optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // Next Auth
    NEXT_PUBLIC_NEXTAUTH_URL: z.string().min(1),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    // Database
    RUN_TIME_DATABASE_HOST: process.env.RUN_TIME_DATABASE_HOST,
    RUN_TIME_DATABASE_USER: process.env.RUN_TIME_DATABASE_USER,
    RUN_TIME_DATABASE_DB_NAME: process.env.RUN_TIME_DATABASE_DB_NAME,
    RUN_TIME_DATABASE_PASSWORD: process.env.RUN_TIME_DATABASE_PASSWORD,
    RUN_TIME_DATABASE_PORT: process.env.RUN_TIME_DATABASE_PORT,
    // Google
    RUN_TIME_GOOGLE_OAUTH_CLIENT_ID:
      process.env.RUN_TIME_GOOGLE_OAUTH_CLIENT_ID,
    RUN_TIME_GOOGLE_OAUTH_CLIENT_SECRET:
      process.env.RUN_TIME_GOOGLE_OAUTH_CLIENT_SECRET,
    // General
    NODE_ENV: process.env.NODE_ENV,
    // Next Auth
    RUN_TIME_NEXTAUTH_SECRET: process.env.RUN_TIME_NEXTAUTH_SECRET,
    NEXT_PUBLIC_NEXTAUTH_URL: process.env.NEXT_PUBLIC_NEXTAUTH_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
