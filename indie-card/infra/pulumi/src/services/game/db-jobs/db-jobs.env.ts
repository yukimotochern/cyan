import { z } from 'zod';
import {
  parseEnv,
  getDopplerEnv,
  EnvDef,
  mapEnvToK8sEnv,
  nonEmptyString,
} from '../../../env/helpers';
import { service } from '../shared/game.env';

export const component = service.component('db-jobs');

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

export const gameDbJobsEnv = parseEnv({
  data: rawEnv,
  def: envDef,
});

export const version =
  gameDbJobsEnv.VERSION !== 'none' ? gameDbJobsEnv.VERSION : 'none';

export const gameDbJobsRunTimeK8sEnv = mapEnvToK8sEnv(
  parseEnv({
    data: rawEnv,
    def: envDef,
    filter: {
      steps: ['runTime'],
    },
  }),
);

export const gameDbJobsBuildTimeK8sEnv = mapEnvToK8sEnv(
  parseEnv({
    data: rawEnv,
    def: envDef,
    filter: {
      steps: ['buildTime'],
    },
  }),
);
