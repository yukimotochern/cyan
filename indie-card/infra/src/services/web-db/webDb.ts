import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import * as k8s from '@pulumi/kubernetes';
import { appName, stack } from '../../env/env.js';
import { isCertificateReady, env, isMinikube } from '../../env/env.js';
import {
  serviceName,
  webDbEnv,
  webDbRunTimeK8sEnv,
  nxProjectName,
} from './webDb.env.js';

const { POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD } = webDbEnv;
const { GITHUB_REGISTRY, GITHUB_USERNAME, GITHUB_SECRET } = env;

export const setupWebDb = ({
  kubProvider,
  githubRegistrySecret,
  certManagerSecret,
}: {
  kubProvider?: pulumi.ProviderResource;
  githubRegistrySecret: k8s.core.v1.Secret;
  certManagerSecret?: pulumi.Output<k8s.core.v1.Secret>;
}) => {
  /**
   * K8s resource name format:
   * `[APP_NAME]-[SERVICE_NAME]-[RESOURCE_NAME]`
   * Variable name format:
   * `[SERVICE_NAME]-[RESOURCE_NAME]`
   * Nx project name:
   * `[APP_NAME]-[SERVICE_NAME]`
   */
  const webDbPrefix = `${appName}-${serviceName}`;

  /**
   * Install CloudNativePG
   *  - Installation: https://cloudnative-pg.io/documentation/1.21/installation_upgrade/
   *  - Examples:
   *    - https://cloudnative-pg.io/documentation/1.21/samples/cluster-example-full.yaml
   *    - https://cloudnative-pg.io/documentation/1.21/samples/cluster-example-projected-volume.yaml
   */
  const webDbCnpg = new k8s.helm.v3.Release(
    `${webDbPrefix}-cnpg`,
    {
      repositoryOpts: {
        repo: 'https://cloudnative-pg.github.io/charts',
      },
      chart: 'cloudnative-pg',
      version: '0.19.1',
      createNamespace: true,
      namespace: 'cnpg-system',
    },
    {
      provider: kubProvider,
    },
  );

  /* Db Credentials */
  const webDbPgSecrets = new k8s.core.v1.Secret(
    `${webDbPrefix}-pg-secret`,
    {
      stringData: {
        username: POSTGRES_USER,
        password: POSTGRES_PASSWORD,
      },
      type: 'kubernetes.io/basic-auth',
    },
    { provider: kubProvider },
  );

  /* CloudNativePG Db Cluster */
  const webDbClusterName = `${webDbPrefix}-cluster`;
  const webDbCluster = new k8s.apiextensions.CustomResource(
    webDbClusterName,
    {
      apiVersion: 'postgresql.cnpg.io/v1',
      kind: 'Cluster',
      metadata: {
        name: webDbClusterName,
      },
      spec: {
        instances: 1,
        postgresql: {
          pg_hba:
            isCertificateReady && certManagerSecret
              ? [
                  'hostssl all all all scram-sha-256',
                  'host all all all scram-sha-256',
                ]
              : [],
        },
        bootstrap: {
          initdb: {
            database: POSTGRES_DB,
            owner: POSTGRES_USER,
            secret: { name: webDbPgSecrets.metadata.name },
          },
        },
        storage: {
          size: '2Gi',
        },
        ...(isCertificateReady &&
          certManagerSecret && {
            projectedVolumeTemplate: {
              sources: [
                {
                  secret: {
                    name: certManagerSecret.metadata.name,
                    items: [
                      {
                        key: 'tls.crt',
                        path: 'certificate/tls.crt',
                      },
                      {
                        key: 'ca.crt',
                        path: 'certificate/ca.crt',
                      },
                      {
                        key: 'tls.key',
                        path: 'certificate/tls.key',
                      },
                    ],
                  },
                },
              ],
            },
          }),
      },
    },
    {
      provider: kubProvider,
      dependsOn: [webDbCnpg, webDbPgSecrets],
    },
  );

  // This name is suggested in https://cloudnative-pg.io/documentation/1.21
  const webDbServiceName = pulumi.interpolate`${webDbCluster.metadata.name}-rw`;

  /* Db Job Image */
  const webDbJobImageRegistry = `${GITHUB_REGISTRY}/${webDbPrefix}-${stack}`;
  const webDbJobImageName = `${webDbJobImageRegistry}:${version}`;
  const webDbJobImage = new docker.Image(`${webDbPrefix}-image`, {
    build: {
      args: {
        ...(!isMinikube && { platform: 'linux/amd64' }),
      },
      context: '../..',
      dockerfile: '../web-db/Dockerfile',
    },
    imageName: webDbJobImageName,
    registry: {
      username: GITHUB_USERNAME,
      password: GITHUB_SECRET,
      server: webDbJobImageRegistry,
    },
  });

  /* Db Job */
  const webDbJobName = `${webDbPrefix}-job`;
  const webDbJob = new k8s.batch.v1.Job(
    webDbJobName,
    {
      spec: {
        template: {
          spec: {
            imagePullSecrets: [
              {
                name: githubRegistrySecret.metadata.name,
              },
            ],
            containers: [
              {
                name: webDbJobName,
                image: webDbJobImage.imageName,
                env: [
                  ...webDbRunTimeK8sEnv,
                  {
                    name: 'DATABASE_HOST',
                    value: webDbServiceName,
                  },
                ],
              },
            ],
            restartPolicy: 'Never',
          },
        },
        backoffLimit: 3,
        ttlSecondsAfterFinished: 60 * 60 * 24 * 5,
      },
    },
    {
      provider: kubProvider,
      dependsOn: [webDbCluster, webDbJobImage],
    },
  );
  return { webDbJob, webDbCluster, webDbServiceName };
};
