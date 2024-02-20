import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import type { GenericNamingBuilder } from '@cyan/utils-naming';

export const createGithubSecret = ({
  kubProvider,
  namespace,
  GITHUB_USERNAME,
  GITHUB_SECRET,
  namingBuilder,
}: {
  kubProvider?: k8s.Provider;
  namingBuilder: GenericNamingBuilder;
  namespace: k8s.core.v1.Namespace;
  GITHUB_USERNAME: string;
  GITHUB_SECRET: pulumi.Output<string>;
}) => {
  const resource = namingBuilder.resource('secret');
  const githubSecret = new k8s.core.v1.Secret(
    resource.output('pulumiResourceName'),
    {
      type: 'kubernetes.io/dockerconfigjson',
      metadata: {
        name: 'github-secret',
        namespace: namespace.metadata.name,
        labels: resource.output('k8sLabel'),
      },
      data: {
        '.dockerconfigjson':
          pulumi.interpolate`${GITHUB_USERNAME}:${GITHUB_SECRET}`.apply(
            (cred) =>
              Buffer.from(
                JSON.stringify({
                  auths: {
                    'ghcr.io': {
                      auth: Buffer.from(cred).toString('base64'),
                    },
                  },
                }),
              ).toString('base64'),
          ),
      },
    },
    { provider: kubProvider },
  );
  return {
    githubSecret,
  };
};
