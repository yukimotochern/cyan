import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import { GenericNamingBuilder } from '@cyan/utils-naming';

import {
  gameNextEnv,
  gameNextRunTimeK8sEnv,
  gameNextBuildTimeEnv,
  version,
} from './game-next.env';

const { PORT } = gameNextEnv;

export const createGameNextApp = ({
  kubProvider,
  githubSecret,
  gameDbCluster,
  gameDbServiceName,
  gameDbJobs,
  namespace,
  namingBuilder,
  GITHUB_USERNAME,
  GITHUB_SECRET,
  GITHUB_REGISTRY,
  isMinikube,
}: {
  kubProvider?: pulumi.ProviderResource;
  githubSecret: k8s.core.v1.Secret;
  gameDbCluster: k8s.apiextensions.CustomResource;
  gameDbServiceName: pulumi.Output<string>;
  gameDbJobs: k8s.batch.v1.Job;
  namespace: k8s.core.v1.Namespace;
  namingBuilder: GenericNamingBuilder;
  GITHUB_USERNAME: string;
  GITHUB_SECRET: pulumi.Output<string>;
  GITHUB_REGISTRY: string;
  isMinikube: boolean;
}) => {
  /* Game-Next Image */
  const image = namingBuilder
    .baseImageRegistry(GITHUB_REGISTRY)
    .imageVersion(version);
  const gameNextImage = new docker.Image(
    namingBuilder.resource('image').output('pulumiResourceName'),
    {
      build: {
        args: {
          ...gameNextBuildTimeEnv,
        },
        context: '.',
        dockerfile: 'indie-card/game/next/Dockerfile',
        ...(!isMinikube && { platform: 'linux/amd64' }),
      },
      imageName: image.output('imageName'),
      registry: {
        username: GITHUB_USERNAME,
        password: GITHUB_SECRET,
        server: GITHUB_REGISTRY,
      },
    },
  );

  /* Game-Next Deployment */
  const gameNextDeploymentResource = namingBuilder.resource('deployment');
  const gameNextDeploymentLabel = gameNextDeploymentResource.output('k8sLabel');
  const gameNextDeployment = new k8s.apps.v1.Deployment(
    gameNextDeploymentResource.output('pulumiResourceName'),
    {
      metadata: {
        namespace: namespace.metadata.name,
        labels: gameNextDeploymentLabel,
      },
      spec: {
        replicas: 1,
        selector: { matchLabels: gameNextDeploymentLabel },
        template: {
          metadata: { labels: gameNextDeploymentLabel },
          spec: {
            imagePullSecrets: [
              {
                name: githubSecret.metadata.name,
              },
            ],
            containers: [
              {
                image: gameNextImage.imageName,
                name: namingBuilder
                  .resource('container')
                  .output('k8sContainerName'),
                ports: [
                  {
                    containerPort: parseInt(PORT),
                  },
                ],
                env: [
                  ...gameNextRunTimeK8sEnv,
                  {
                    name: 'DATABASE_HOST',
                    value: pulumi.interpolate`${gameDbServiceName}.${gameDbCluster.metadata.namespace}`,
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
      dependsOn: [gameDbCluster, gameDbJobs],
    },
  );

  /* Game-Next Service */
  const gameNextSvcResource = namingBuilder.resource('service');
  const gameNextSvc = new k8s.core.v1.Service(
    gameNextSvcResource.output('pulumiResourceName'),
    {
      metadata: {
        name: gameNextSvcResource.output('k8sMetaName'),
        namespace: namespace.metadata.name,
        labels: gameNextSvcResource.output('k8sLabel'),
      },
      spec: {
        type: 'ClusterIP',
        ports: [{ port: 80, targetPort: parseInt(PORT) }],
        selector: gameNextDeploymentLabel,
      },
    },
    {
      provider: kubProvider,
      dependsOn: [gameNextDeployment],
    },
  );
  return {
    gameNextSvc,
  };
};
