import * as pulumi from '@pulumi/pulumi';
import { z } from 'zod';
import { EnvDef, nonEmptyString, parseEnv } from './helpers.js';

export const stack = pulumi.getStack();
export const appName = 'indie-card';
export const serviceName = 'infra';

const envDef = {
  /**
   * Doppler env
   * Doppler token is required to be available on pulumi preview phase. Therefore,
   * it can not be set as secret. This is because `pulumi.secret` is not available
   * in such phases.
   */
  DOPPLER_TOKEN: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['infra'],
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
    steps: ['infra'],
  },
  SPACES_SECRET_ACCESS_KEY: {
    schema: nonEmptyString,
    isSecret: true,
    steps: ['infra'],
  },
  DIGITALOCEAN_TOKEN: {
    schema: nonEmptyString,
    isSecret: true,
    steps: ['infra'],
  },
} satisfies EnvDef;

export const env = parseEnv({
  data: process.env,
  def: envDef,
});

export const isDnsReady =
  env.SSL_STATUS === 'dns ready' ||
  env.SSL_STATUS === 'certificate and dns ready';

export const isCertificateReady =
  env.SSL_STATUS === 'certificate and dns ready';

export const isMinikube = env.K8S_PROVIDER_NAME === 'mini';
