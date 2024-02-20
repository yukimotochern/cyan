import {
  STACK,
  EnvDef,
  nonEmptyString,
  parseEnv,
  getDopplerEnv,
} from './helpers';

export const projectName = 'tw';
export const stack = STACK;
export const serviceName = 'infra';
export const componentName = 'pulumi';
export const pulumiPrefix = `${projectName}-${stack}-${serviceName}-${componentName}`;

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
  INDIE_CARD_WEB_HOST_DOMAIN: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['infra'],
  },
} satisfies EnvDef;

const projectEnv = await getDopplerEnv({
  appName: projectName,
  serviceName,
  componentName,
});

export const pulumiEnv = parseEnv({
  data: projectEnv,
  def: envDef,
  filter: {
    steps: ['pulumi'],
  },
});

export const infraEnv = parseEnv({
  data: projectEnv,
  def: envDef,
  filter: {
    steps: ['infra'],
  },
});
