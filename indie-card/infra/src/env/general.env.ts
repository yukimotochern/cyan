import { z } from 'zod';
import { stack, appName, parseEnv, getDopplerEnv, EnvDef } from './env';

export const serviceName = 'general';

const rawEnv = await getDopplerEnv({
  appName,
  serviceName,
  envName: stack,
});

const nonEmptyString = z.string().min(1);

const envDef = {
  // K8s
  INFRA_K8S_PROVIDER_NAME: {
    schema: z.union([
      z.literal('doks'), // DigitalOcean Kubernetes
      z.literal('eks'), // Amazon Elastic Kubernetes Service
      z.literal('gke'), // Google Kubernetes Engine
      z.literal('mini'), // Local Minikube
    ]),
    isSecret: false,
  },
  // Github
  INFRA_GITHUB_SECRET: {
    schema: nonEmptyString,
    isSecret: true,
  },
  INFRA_GITHUB_USERNAME: {
    schema: nonEmptyString,
    isSecret: false,
  },
  INFRA_GITHUB_REGISTRY: {
    schema: nonEmptyString,
    isSecret: false,
  },
  // Network
  INFRA_SSL_STATUS: {
    schema: z.union([
      z.literal('not set'),
      z.literal('dns ready'),
      z.literal('certificate and dns ready'),
    ]),
    isSecret: false,
  },
  INFRA_LETS_ENCRYPT_EMAIL: {
    schema: z.string().email(),
    isSecret: false,
  },
  INFRA_INDIE_CARD_WEB_HOST_DOMAIN: {
    schema: nonEmptyString,
    isSecret: false,
  },
  // Digital Ocean
  INFRA_SPACES_ACCESS_KEY_ID: {
    schema: nonEmptyString,
    isSecret: false,
  },
  INFRA_SPACES_SECRET_ACCESS_KEY: {
    schema: nonEmptyString,
    isSecret: true,
  },
  INFRA_DIGITALOCEAN_TOKEN: {
    schema: nonEmptyString,
    isSecret: true,
  },
} satisfies EnvDef;

export const generalEnv = parseEnv({
  data: rawEnv,
  def: envDef,
});

export const isDnsReady =
  generalEnv.INFRA_SSL_STATUS === 'dns ready' ||
  generalEnv.INFRA_SSL_STATUS === 'not set';

export const isCertificateReady =
  generalEnv.INFRA_SSL_STATUS === 'certificate and dns ready';

export const isMinikube = generalEnv.INFRA_K8S_PROVIDER_NAME === 'mini';
