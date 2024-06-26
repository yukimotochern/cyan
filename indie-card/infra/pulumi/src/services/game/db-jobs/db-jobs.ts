import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import * as k8s from '@pulumi/kubernetes';
import { gameDbJobsRunTimeK8sEnv, version } from './db-jobs.env';
import { GenericNamingBuilder } from '@cyan/utils-naming';
import {
  VersionHistory,
  getImageVersionByStackOutputGitAndVersionEnv,
} from '@cyan/utils-infra';

export const createGameDbJobs = async ({
  kubProvider,
  githubSecret,
  gameDbCluster,
  gameDbServiceName,
  namespace,
  namingBuilder,
  GITHUB_USERNAME,
  GITHUB_SECRET,
  GITHUB_REGISTRY,
  isMinikube,
  versionHistory,
}: {
  kubProvider?: pulumi.ProviderResource;
  githubSecret: k8s.core.v1.Secret;
  gameDbCluster: k8s.apiextensions.CustomResource;
  gameDbServiceName: pulumi.Output<string>;
  namespace: k8s.core.v1.Namespace;
  namingBuilder: GenericNamingBuilder;
  GITHUB_USERNAME: string;
  GITHUB_SECRET: pulumi.Output<string>;
  GITHUB_REGISTRY: string;
  isMinikube: boolean;
  versionHistory?: VersionHistory;
}) => {
  const { versionTagToUse, outputInfo, buildImage } =
    await getImageVersionByStackOutputGitAndVersionEnv({
      outputInfo: versionHistory,
      versionTagEnv: version,
      nxProjectName: namingBuilder.output('nxProjectName'),
    });
  /* Game DB jobs Image */
  const image = namingBuilder
    .baseImageRegistry(GITHUB_REGISTRY)
    .imageVersion(versionTagToUse);
  let gameDbJobsImage: docker.Image | undefined;
  if (buildImage) {
    gameDbJobsImage = new docker.Image(
      namingBuilder.resource('image').output('pulumiResourceName'),
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
    if (outputInfo) {
      outputInfo.versionTag = gameDbJobsImage.imageName.apply(
        (img) => img.split(':')[1] || '',
      );
    }
  }

  /* Game Db Jobs */
  const gameDbJobsResource = namingBuilder.resource('job');
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
                name: namingBuilder
                  .resource('container')
                  .output('k8sContainerName'),
                image: image.output('imageName'),
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
      dependsOn: [gameDbCluster, ...(gameDbJobsImage ? [gameDbJobsImage] : [])],
    },
  );
  return { gameDbJobs, outputInfo };
};
