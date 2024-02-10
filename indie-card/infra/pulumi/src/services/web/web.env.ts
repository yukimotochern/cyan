import {
  parseEnv,
  getDopplerEnv,
  EnvDef,
  mapEnvToK8sEnv,
  nonEmptyString,
} from '../../env/helpers.js';
import { stack, appName, env } from '../../env/env.js';
import { z } from 'zod';

export const serviceName = 'web';

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
  // Server
  PORT: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['runTime'],
  },
  // Database
  DATABASE_PORT: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['runTime'],
  },
  DATABASE_USER: {
    schema: nonEmptyString,
    isSecret: true,
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
  // Auth
  NEXTAUTH_SECRET: {
    schema: nonEmptyString,
    isSecret: true,
    steps: ['runTime'],
  },
  BACKEND_URL: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['runTime'],
  },
  NEXTAUTH_URL: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['runTime'],
  },
  // Google
  GOOGLE_OAUTH_CLIENT_ID: {
    schema: nonEmptyString,
    isSecret: true,
    steps: ['runTime'],
  },
  GOOGLE_OAUTH_CLIENT_SECRET: {
    schema: nonEmptyString,
    isSecret: true,
    steps: ['runTime'],
  },
} satisfies EnvDef;

export const webEnv = parseEnv({
  data: rawEnv,
  def: envDef,
});

export const version = webEnv.VERSION !== '' ? webEnv.VERSION : '';

export const webRunTimeK8sEnv = mapEnvToK8sEnv(
  parseEnv({
    data: rawEnv,
    def: envDef,
    filter: {
      steps: ['runTime'],
    },
  }),
);

export const webBuildTimeEnv = parseEnv({
  data: rawEnv,
  def: envDef,
  filter: {
    steps: ['buildTime'],
  },
});
