import { z } from 'zod';
import { naming } from '@cyan/utils-naming';
import {
  EnvDef,
  nonEmptyString,
  parseEnv,
  getDopplerEnv,
  stack as stackFromProcessEnv,
} from './helpers';

export const project = naming.project('tw');
export const stack = project.stack(stackFromProcessEnv);
export const service = stack.service('infra');

const envDef = {
  // Pulumi
  PULUMI_ACCESS_TOKEN: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['pulumi'],
  },
  // Github
  GITHUB_SECRET: {
    schema: nonEmptyString,
    isSecret: true,
    steps: ['infra'],
  },
  GITHUB_USERNAME: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['infra'],
  },
  GITHUB_REGISTRY: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['infra'],
  },

  LETS_ENCRYPT_EMAIL: {
    schema: z.string().email(),
    isSecret: false,
    steps: ['infra'],
  },
  INDIE_CARD_WEB_HOST_DOMAIN: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['infra'],
  },
} satisfies EnvDef;

const rawEnv = await getDopplerEnv({
  naming: service,
});

export const infraEnv = parseEnv({
  data: rawEnv,
  def: envDef,
  filter: {
    steps: ['infra'],
  },
});

export const pulumiEnv = parseEnv({
  data: rawEnv,
  def: envDef,
  filter: {
    steps: ['pulumi'],
  },
});
