import { z } from 'zod';
import {
  parseEnv,
  getDopplerEnv,
  EnvDef,
  mapEnvToK8sEnv,
  nonEmptyString,
} from '../../env/helpers.js';
import { stack, appName, env } from '../../env/env.js';

export const serviceName = 'web-db';

export const nxProjectName = `${appName}-${serviceName}`;

const rawEnv = await getDopplerEnv({
  appName,
  serviceName,
  envName: stack,
  dopplerToken: env.DOPPLER_TOKEN,
});

const envDef = {
  // Infra
  VERSION: {
    schema: z.string(),
    isSecret: false,
    steps: ['infra'],
  },
  POSTGRES_DB: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['infra'],
  },
  POSTGRES_USER: {
    schema: nonEmptyString,
    isSecret: true,
    steps: ['infra'],
  },
  POSTGRES_PASSWORD: {
    schema: nonEmptyString,
    isSecret: true,
    steps: ['infra'],
  },
  // Run time
  ACTION: {
    schema: z.union([
      z.literal('migration'),
      z.literal('push'),
      z.literal('none'),
    ]),
    isSecret: false,
    steps: ['runTime'],
  },
  DATABASE_DB_NAME: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['runTime'],
  },
  DATABASE_PASSWORD: {
    schema: nonEmptyString,
    isSecret: true,
    steps: ['runTime'],
  },
  DATABASE_USER: {
    schema: nonEmptyString,
    isSecret: true,
    steps: ['runTime'],
  },
  DATABASE_PORT: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['runTime'],
  },
} satisfies EnvDef;

export const webDbEnv = parseEnv({
  data: rawEnv,
  def: envDef,
});

export const webDbRunTimeK8sEnv = mapEnvToK8sEnv(
  parseEnv({
    data: rawEnv,
    def: envDef,
    filter: {
      steps: ['runTime'],
    },
  }),
);

export const webDbBuildTimeK8sEnv = mapEnvToK8sEnv(
  parseEnv({
    data: rawEnv,
    def: envDef,
    filter: {
      steps: ['buildTime'],
    },
  }),
);
