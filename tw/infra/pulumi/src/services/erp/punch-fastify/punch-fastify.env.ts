import { z } from 'zod';
import {
  parseEnv,
  getDopplerEnv,
  EnvDef,
  mapEnvToK8sEnv,
  nonEmptyString,
} from '../../../env/helpers';
import { service } from '../shared/erp.env';

export const component = service.component('punch-fastify');

const rawEnv = await getDopplerEnv({
  naming: component,
});

const tfStringSchema = z.union([z.literal('true'), z.literal('false')]);

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
  HOST: {
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
} satisfies EnvDef;

export const gameDbJobsEnv = parseEnv({
  data: rawEnv,
  def: envDef,
});

export const version = gameDbJobsEnv.VERSION;

export const erpScraperRunTimeK8sEnv = mapEnvToK8sEnv(
  parseEnv({
    data: rawEnv,
    def: envDef,
    filter: {
      steps: ['runTime'],
    },
  }),
);

export const erpScraperBuildTimeK8sEnv = mapEnvToK8sEnv(
  parseEnv({
    data: rawEnv,
    def: envDef,
    filter: {
      steps: ['buildTime'],
    },
  }),
);
