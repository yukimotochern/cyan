import { z } from 'zod';
import {
  parseEnv,
  getDopplerEnv,
  EnvDef,
  mapEnvToK8sEnv,
} from '../../../env/helpers';
import { service } from '../shared/erp.env';

export const component = service.component('scraper');

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
  SLEEP_TIME: {
    schema: z.string(),
    isSecret: false,
    steps: ['runTime'],
  },
  API_PATH: {
    schema: z.string().url(),
    isSecret: false,
    steps: ['runTime'],
  },
  MAX_LIVING_PAGE: {
    schema: z.string(),
    isSecret: false,
    steps: ['runTime'],
  },
  DO_KEYWORD: {
    schema: tfStringSchema,
    isSecret: false,
    steps: ['runTime'],
  },
  KEYWORD_RETRY: {
    schema: z.string(),
    isSecret: false,
    steps: ['runTime'],
  },
  UPLOAD_KEYWORD_TO_SERVER: {
    schema: tfStringSchema,
    isSecret: false,
    steps: ['runTime'],
  },
  DO_LIVING: {
    schema: tfStringSchema,
    isSecret: false,
    steps: ['runTime'],
  },
  LIVING_RETRY: {
    schema: z.string(),
    isSecret: false,
    steps: ['runTime'],
  },
  UPLOAD_LIVING_TO_SERVER: {
    schema: tfStringSchema,
    isSecret: false,
    steps: ['runTime'],
  },
  LINE_CHANNEL_ACCESS_TOKEN: {
    schema: z.string(),
    isSecret: false,
    steps: ['runTime'],
  },
  LINE_TOUCH_WHALE_ALERT_GROUP_ID: {
    schema: z.string(),
    isSecret: false,
    steps: ['runTime'],
  },
  ZENROWS_TOKEN: {
    schema: z.string(),
    isSecret: false,
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
