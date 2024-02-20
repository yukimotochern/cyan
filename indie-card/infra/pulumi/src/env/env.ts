import { z } from 'zod';
import { naming } from '@cyan/utils-naming';
import {
  EnvDef,
  nonEmptyString,
  parseEnv,
  getDopplerEnv,
  stack as stackFromProcessEnv,
} from './helpers';

export const project = naming.project('indie-card');
export const stack = project.stack(stackFromProcessEnv);
export const service = stack.service('infra');

const envDef = {
  // Pulumi
  PULUMI_ACCESS_TOKEN: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['pulumi'],
  },
  // K8s
  K8S_PROVIDER_NAME: {
    schema: z.union([
      z.literal('doks'), // DigitalOcean Kubernetes
      z.literal('eks'), // Amazon Elastic Kubernetes Service
      z.literal('gke'), // Google Kubernetes Engine
      z.literal('mini'), // Local Minikube
    ]),
    isSecret: false,
    steps: ['infra'],
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
  // Network
  SSL_STATUS: {
    schema: z.union([
      z.literal('not set'),
      z.literal('dns ready'),
      z.literal('certificate and dns ready'),
    ]),
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
  // Digital Ocean
  SPACES_ACCESS_KEY_ID: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['pulumi'],
  },
  SPACES_SECRET_ACCESS_KEY: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['pulumi'],
  },
  DIGITALOCEAN_TOKEN: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['pulumi'],
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

export const isDnsReady =
  infraEnv.SSL_STATUS === 'dns ready' ||
  infraEnv.SSL_STATUS === 'certificate and dns ready';

export const isCertificateReady =
  infraEnv.SSL_STATUS === 'certificate and dns ready';

export const isMinikube = infraEnv.K8S_PROVIDER_NAME === 'mini';
