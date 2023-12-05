import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import * as k8s from '@pulumi/kubernetes';
import { appName } from '../../env/env';
import { isCertificateReady, generalEnv } from '../../env/general.env';
import { serviceName, webDbEnv, webDbRunTimeEnv } from './webDb.env';

const { INFRA_POSTGRES_DB, INFRA_POSTGRES_USER, INFRA_POSTGRES_PASSWORD } =
  webDbEnv;
const { INFRA_GITHUB_REGISTRY, INFRA_GITHUB_USERNAME, INFRA_GITHUB_SECRET } =
  generalEnv;

export const setupWebDb = ({
  kubProvider,
  githubRegistrySecret,
  version,
  certManagerSecret,
}: {
  kubProvider?: pulumi.ProviderResource;
  githubRegistrySecret: k8s.core.v1.Secret;
  version: string;
  certManagerSecret?: pulumi.Output<k8s.core.v1.Secret>;
}) => {
  /**
   * K8s resource name format:
   * `[APP_NAME]-[SERVICE_NAME]-[RESOURCE_NAME]`
   * Variable name format:
   * `[SERVICE_NAME]-[RESOURCE_NAME]`
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
        username: INFRA_POSTGRES_USER,
        password: INFRA_POSTGRES_PASSWORD,
      },
      type: 'kubernetes.io/basic-auth',
    },
    { provider: kubProvider },
  );

  /* CloudNativePG Db Cluster */
  const webDbCluster = new k8s.apiextensions.CustomResource(
    `${webDbPrefix}-cluster`,
    {
      apiVersion: 'postgresql.cnpg.io/v1',
      kind: 'Cluster',
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
            database: INFRA_POSTGRES_DB,
            owner: INFRA_POSTGRES_USER,
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
  const webDbJobImageRegistry = `${INFRA_GITHUB_REGISTRY}/${serviceName}`;
  const webDbJobImageName = `${webDbJobImageRegistry}:${version}`;
  const webDbJobImage = new docker.Image(`${webDbPrefix}-image`, {
    build: {
      args: {
        platform: 'linux/amd64',
      },
      context: '../../../../..',
      dockerfile: '../../../../web-db/Dockerfile',
    },
    imageName: webDbJobImageName,
    registry: {
      username: INFRA_GITHUB_USERNAME,
      password: INFRA_GITHUB_SECRET,
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
                  ...Object.entries(webDbRunTimeEnv).map(([key, value]) => ({
                    name: key,
                    value,
                  })),
                  {
                    name: 'RUN_TIME_DATABASE_HOST',
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
