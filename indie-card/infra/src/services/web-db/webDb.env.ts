import { z } from 'zod';
import { stack, appName, parseEnv, getDopplerEnv, EnvDef } from '../../env/env';

export const serviceName = 'web-db';

const rawEnv = await getDopplerEnv({
  appName,
  serviceName,
  envName: stack,
});

const nonEmptyString = z.string().min(1);

const envDef = {
  // Infra
  INFRA_POSTGRES_DB: {
    schema: nonEmptyString,
    isSecret: false,
  },
  INFRA_POSTGRES_USER: {
    schema: nonEmptyString,
    isSecret: true,
  },
  INFRA_POSTGRES_PASSWORD: {
    schema: nonEmptyString,
    isSecret: true,
  },
  // Run time
  RUN_TIME_ACTION: {
    schema: z.union([
      z.literal('migration'),
      z.literal('push'),
      z.literal('none'),
    ]),
    isSecret: false,
  },
  RUN_TIME_DATABASE_DB_NAME: {
    schema: nonEmptyString,
    isSecret: false,
  },
  RUN_TIME_DATABASE_PASSWORD: { schema: nonEmptyString, isSecret: true },
  RUN_TIME_DATABASE_USER: { schema: nonEmptyString, isSecret: true },
  RUN_TIME_DATABASE_PORT: { schema: nonEmptyString, isSecret: false },
} satisfies EnvDef;

export const webDbEnv = parseEnv({
  data: rawEnv,
  def: envDef,
});

export const webDbRunTimeEnv = parseEnv({
  data: rawEnv,
  def: envDef,
  filter: {
    step: 'runTime',
  },
});

export const webDbBuildTimeEnv = parseEnv({
  data: rawEnv,
  def: envDef,
  filter: {
    step: 'buildTime',
  },
});
