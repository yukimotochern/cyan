import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import { appName, stack } from '../../env/env.js';
import { env, isMinikube } from '../../env/env.js';
import {
  serviceName,
  webEnv,
  webRunTimeK8sEnv,
  webBuildTimeEnv,
  version,
} from './web.env.js';

const { GITHUB_REGISTRY, GITHUB_USERNAME, GITHUB_SECRET } = env;

const { PORT } = webEnv;

export const setupWebApp = ({
  kubProvider,
  githubRegistrySecret,
  webDbCluster,
  webDbServiceName,
  webDbJob,
}: {
  kubProvider?: pulumi.ProviderResource;
  githubRegistrySecret: k8s.core.v1.Secret;
  webDbCluster: k8s.apiextensions.CustomResource;
  webDbJob: k8s.batch.v1.Job;
  webDbServiceName: pulumi.Output<string>;
}) => {
  const webPrefix = `${appName}-${serviceName}`;
  const webLabel = { app: webPrefix };

  /* Web Image */
  const webImageRegistry = `${GITHUB_REGISTRY}/${webPrefix}-${stack}`;
  const webImageName = `${webImageRegistry}:${version}`;
  const webImage = new docker.Image(`${webPrefix}-image`, {
    build: {
      args: {
        ...(!isMinikube && { platform: 'linux/amd64' }),
        ...webBuildTimeEnv,
      },
      context: '../..',
      dockerfile: '../web/Dockerfile',
    },
    imageName: webImageName,
    registry: {
      username: GITHUB_USERNAME,
      password: GITHUB_SECRET,
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
                    containerPort: parseInt(PORT),
                  },
                ],
                env: [
                  ...webRunTimeK8sEnv,
                  {
                    name: 'DATABASE_HOST',
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
        ports: [{ port: 80, targetPort: parseInt(PORT) }],
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
