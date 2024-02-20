import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import * as k8s from '@pulumi/kubernetes';
import { gameDbJobsRunTimeK8sEnv, version } from './db-jobs.env';
import { GenericNamingBuilder } from '@cyan/utils-naming';

export const createGameDbJobs = ({
  kubProvider,
  githubSecret,
  gameDbCluster,
  gameDbServiceName,
  namespace,
  naming,
  GITHUB_USERNAME,
  GITHUB_SECRET,
  GITHUB_REGISTRY,
  isMinikube,
}: {
  kubProvider?: pulumi.ProviderResource;
  githubSecret: k8s.core.v1.Secret;
  gameDbCluster: k8s.apiextensions.CustomResource;
  gameDbServiceName: pulumi.Output<string>;
  namespace: k8s.core.v1.Namespace;
  naming: GenericNamingBuilder;
  GITHUB_USERNAME: string;
  GITHUB_SECRET: pulumi.Output<string>;
  GITHUB_REGISTRY: string;
  isMinikube: boolean;
}) => {
  /* Game DB jobs Image */
  const image = naming.baseImageRegistry(GITHUB_REGISTRY).imageVersion(version);
  const gameDbJobsImage = new docker.Image(
    naming.resource('image').output('pulumiResourceName'),
    {
      build: {
        context: '.',
        dockerfile: 'indie-card/game/db-jobs/Dockerfile',
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

  /* Game Db Jobs */
  const gameDbJobsResource = naming.resource('job');
  const gameDbJobs = new k8s.batch.v1.Job(
    gameDbJobsResource.output('pulumiResourceName'),
    {
      metadata: {
        namespace: namespace.metadata.name,
        labels: gameDbJobsResource.output('k8sLabel'),
      },
      spec: {
        template: {
          spec: {
            imagePullSecrets: [
              {
                name: githubSecret.metadata.name,
              },
            ],
            containers: [
              {
                name: naming.resource('container').output('k8sContainerName'),
                image: gameDbJobsImage.imageName,
                env: [
                  ...gameDbJobsRunTimeK8sEnv,
                  {
                    name: 'DATABASE_HOST',
                    value: pulumi.interpolate`${gameDbServiceName}.${gameDbCluster.metadata.namespace}`,
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
      dependsOn: [gameDbCluster],
    },
  );
  return { gameDbJobs };
};
