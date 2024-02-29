import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import { GenericNamingBuilder } from '@cyan/utils-naming';
import {
  VersionHistory,
  getImageVersionByStackOutputGitAndVersionEnv,
} from '@cyan/utils-infra';

import {
  erpPunchFastifyEnv,
  erpPunchFastifyRunTimeK8sEnv,
  version,
} from './punch-fastify.env';

const { PORT } = erpPunchFastifyEnv;

export const createPunchFastifyApp = async ({
  kubProvider,
  githubSecret,
  dbCluster,
  dbServiceName,
  dbJobs,
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
  dbCluster: k8s.apiextensions.CustomResource;
  dbServiceName: pulumi.Output<string>;
  dbJobs: k8s.batch.v1.Job;
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
  /* Image */
  const image = namingBuilder
    .baseImageRegistry(GITHUB_REGISTRY)
    .imageVersion(versionTagToUse);
  let punchFastifyImage: docker.Image | undefined;
  if (buildImage) {
    punchFastifyImage = new docker.Image(
      namingBuilder.resource('image').output('pulumiResourceName'),
      {
        build: {
          context: '.',
          dockerfile: 'tw/erp/punch-fastify/Dockerfile',
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
      outputInfo.versionTag = punchFastifyImage.imageName.apply(
        (img) => img.split(':')[1] || '',
      );
    }
  }

  /* Deployment */
  const deploymentResource = namingBuilder.resource('deployment');
  const deploymentLabel = deploymentResource.output('k8sLabel');
  const deployment = new k8s.apps.v1.Deployment(
    deploymentResource.output('pulumiResourceName'),
    {
      metadata: {
        namespace: namespace.metadata.name,
        labels: deploymentLabel,
      },
      spec: {
        replicas: 1,
        selector: { matchLabels: deploymentLabel },
        template: {
          metadata: { labels: deploymentLabel },
          spec: {
            imagePullSecrets: [
              {
                name: githubSecret.metadata.name,
              },
            ],
            containers: [
              {
                image: image.output('imageName'),
                name: namingBuilder
                  .resource('container')
                  .output('k8sContainerName'),
                ports: [
                  {
                    containerPort: parseInt(PORT),
                  },
                ],
                env: [
                  ...erpPunchFastifyRunTimeK8sEnv,
                  {
                    name: 'DATABASE_HOST',
                    value: pulumi.interpolate`${dbServiceName}.${dbCluster.metadata.namespace}`,
                  },
                  {
                    name: 'IS_KUBERNETES',
                    value: 'true',
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
      dependsOn: [
        dbCluster,
        dbJobs,
        ...(punchFastifyImage ? [punchFastifyImage] : []),
      ],
    },
  );

  /* Service */
  const svcResource = namingBuilder.resource('service');
  const svc = new k8s.core.v1.Service(
    svcResource.output('pulumiResourceName'),
    {
      metadata: {
        name: svcResource.output('k8sMetaName'),
        namespace: namespace.metadata.name,
        labels: svcResource.output('k8sLabel'),
      },
      spec: {
        type: 'ClusterIP',
        ports: [{ port: 80, targetPort: parseInt(PORT) }],
        selector: deploymentLabel,
      },
    },
    {
      provider: kubProvider,
      dependsOn: [deployment],
    },
  );
  return {
    svc,
    outputInfo,
  };
};
