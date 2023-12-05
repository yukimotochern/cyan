import { z } from 'zod';
import { stack, appName, parseEnv, getDopplerEnv, EnvDef } from '../../env/env';

export const serviceName = 'web';

const rawEnv = await getDopplerEnv({
  appName,
  serviceName,
  envName: stack,
});

const nonEmptyString = z.string().min(1);

const envDef = {
  // Server
  RUN_TIME_PORT: {
    schema: nonEmptyString,
    isSecret: false,
  },
  // Database
  RUN_TIME_DATABASE_PORT: {
    schema: nonEmptyString,
    isSecret: false,
  },
  RUN_TIME_DATABASE_USER: {
    schema: nonEmptyString,
    isSecret: true,
  },
  RUN_TIME_DATABASE_DB_NAME: {
    schema: nonEmptyString,
    isSecret: false,
  },
  RUN_TIME_DATABASE_PASSWORD: {
    schema: nonEmptyString,
    isSecret: true,
  },
  // Auth
  RUN_TIME_NEXTAUTH_SECRET: {
    schema: nonEmptyString,
    isSecret: true,
  },
  RUN_TIME_BACKEND_URL: {
    schema: nonEmptyString,
    isSecret: false,
  },
  RUN_TIME_NEXTAUTH_URL: {
    schema: nonEmptyString,
    isSecret: false,
  },
  // Google
  RUN_TIME_GOOGLE_OAUTH_CLIENT_ID: {
    schema: nonEmptyString,
    isSecret: true,
  },
  RUN_TIME_GOOGLE_OAUTH_CLIENT_SECRET: {
    schema: nonEmptyString,
    isSecret: true,
  },
} satisfies EnvDef;

export const webEnv = parseEnv({
  data: rawEnv,
  def: envDef,
});

export const webRunTimeEnv = parseEnv({
  data: rawEnv,
  def: envDef,
  filter: {
    step: 'runTime',
  },
});
