import { z } from 'zod';
import {
  parseEnv,
  getDopplerEnv,
  EnvDef,
  mapEnvToK8sEnv,
  nonEmptyString,
} from '../../../env/helpers';
import { service } from '../shared/game.env';

export const component = service.component('next');

const rawEnv = await getDopplerEnv({
  naming: component,
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

export const gameNextEnv = parseEnv({
  data: rawEnv,
  def: envDef,
});

export const version =
  gameNextEnv.VERSION !== 'none' ? gameNextEnv.VERSION : 'none';

export const gameNextRunTimeK8sEnv = mapEnvToK8sEnv(
  parseEnv({
    data: rawEnv,
    def: envDef,
    filter: {
      steps: ['runTime'],
    },
  }),
);

export const gameNextBuildTimeEnv = parseEnv({
  data: rawEnv,
  def: envDef,
  filter: {
    steps: ['buildTime'],
  },
});
