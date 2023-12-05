import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import { appName } from '../../env/env';
import { generalEnv } from '../../env/general.env';
import { serviceName, webEnv, webRunTimeEnv } from './web.env';

const { INFRA_GITHUB_REGISTRY, INFRA_GITHUB_USERNAME, INFRA_GITHUB_SECRET } =
  generalEnv;

const { RUN_TIME_PORT } = webEnv;

export const setupWebApp = ({
  version,
  kubProvider,
  githubRegistrySecret,
  webDbCluster,
  webDbServiceName,
  webDbJob,
}: {
  version: string;
  kubProvider?: pulumi.ProviderResource;
  githubRegistrySecret: k8s.core.v1.Secret;
  webDbCluster: k8s.apiextensions.CustomResource;
  webDbJob: k8s.batch.v1.Job;
  webDbServiceName: pulumi.Output<string>;
}) => {
  const webPrefix = `${appName}-${serviceName}`;
  const webLabel = { app: webPrefix };

  /* Web Image */
  const webImageRegistry = `${INFRA_GITHUB_REGISTRY}/${serviceName}`;
  const webImageName = `${webImageRegistry}:${version}`;
  const webImage = new docker.Image(`${webPrefix}-image`, {
    build: {
      args: {
        platform: 'linux/amd64',
      },
      context: '../../../../..',
      dockerfile: '../../../../web/Dockerfile',
    },
    imageName: webImageName,
    registry: {
      username: INFRA_GITHUB_USERNAME,
      password: INFRA_GITHUB_SECRET,
      server: webImageRegistry,
    },
  });

  /* Web Deployment */
  const webDeployment = new k8s.apps.v1.Deployment(
    `${webPrefix}-deployment`,
    {
      spec: {
        replicas: 1,
        selector: { matchLabels: webLabel },
        template: {
          metadata: { labels: webLabel },
          spec: {
            imagePullSecrets: [
              {
                name: githubRegistrySecret.metadata.name,
              },
            ],
            containers: [
              {
                image: webImage.imageName,
                name: `${webPrefix}-container`,
                ports: [
                  {
                    containerPort: parseInt(RUN_TIME_PORT),
                  },
                ],
                env: [
                  ...Object.entries(webRunTimeEnv).map(([key, value]) => ({
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
          },
        },
      },
    },
    {
      provider: kubProvider,
      dependsOn: [webDbCluster, webDbJob, webImage],
    },
  );

  /* Web Service */
  const webSvcName = `${webPrefix}-service`;
  const webSvc = new k8s.core.v1.Service(
    webSvcName,
    {
      metadata: {
        name: webSvcName,
      },
      spec: {
        type: 'ClusterIP',
        ports: [{ port: 80, targetPort: RUN_TIME_PORT }],
        selector: webLabel,
      },
    },
    {
      provider: kubProvider,
      dependsOn: [webDeployment],
    },
  );

  return {
    webSvc,
  };
};
