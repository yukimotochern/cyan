import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as docker from '@pulumi/docker';
import { GenericNamingBuilder } from '@cyan/utils-naming';
import {
  ImageOutputInfo,
  getImageVersionByStackOutputGitAndVersionEnv,
} from '@cyan/utils-infra';
import { version, erpScraperRunTimeK8sEnv } from './scraper.env';

export const createScraperCronJob = async ({
  kubProvider,
  githubSecret,
  namespace,
  namingBuilder,
  GITHUB_USERNAME,
  GITHUB_SECRET,
  GITHUB_REGISTRY,
  isMinikube,
  imageOutputInfo,
}: {
  kubProvider?: pulumi.ProviderResource;
  githubSecret: k8s.core.v1.Secret;
  namespace: k8s.core.v1.Namespace;
  namingBuilder: GenericNamingBuilder;
  GITHUB_USERNAME: string;
  GITHUB_SECRET: pulumi.Output<string>;
  GITHUB_REGISTRY: string;
  isMinikube: pulumi.Output<boolean>;
  imageOutputInfo: ImageOutputInfo;
}) => {
  const { versionTagToUse, outputInfo, buildImage } =
    await getImageVersionByStackOutputGitAndVersionEnv({
      outputInfo: imageOutputInfo,
      versionTagEnv: version,
      nxProjectName: namingBuilder.output('nxProjectName'),
    });
  /* Image */
  const image = namingBuilder
    .baseImageRegistry(GITHUB_REGISTRY)
    .imageVersion(versionTagToUse);
  let scraperImage: docker.Image | undefined;
  if (buildImage) {
    scraperImage = new docker.Image(
      namingBuilder.resource('image').output('pulumiResourceName'),
      {
        build: {
          context: '.',
          dockerfile: 'tw/erp/scraper/Dockerfile',
          ...isMinikube.apply((val) => !val && { platform: 'linux/amd64' }),
        },
        imageName: image.output('imageName'),
        registry: {
          username: GITHUB_USERNAME,
          password: GITHUB_SECRET,
          server: GITHUB_REGISTRY,
        },
      },
    );
  }
  /* CronJob */
  const scraperCronJobResource = namingBuilder.resource('cron-job');
  new k8s.batch.v1.CronJob(
    scraperCronJobResource.output('pulumiResourceName'),
    {
      metadata: {
        name: scraperCronJobResource.output('k8sMetaName'),
        labels: scraperCronJobResource.output('k8sLabel'),
        namespace: namespace.metadata.name,
      },
      spec: {
        timeZone: 'Asia/Taipei',
        schedule: '15 11 * * *',
        jobTemplate: {
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
                    env: [...erpScraperRunTimeK8sEnv],
                  },
                ],
                restartPolicy: 'Never',
              },
            },
            backoffLimit: 0,
            ttlSecondsAfterFinished: 60 * 60 * 24 * 5,
          },
        },
        successfulJobsHistoryLimit: 1,
        failedJobsHistoryLimit: 1,
      },
    },
    {
      provider: kubProvider,
      dependsOn: scraperImage && [scraperImage],
    },
  );
  return {
    outputInfo,
  };
};
