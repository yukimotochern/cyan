import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { env } from '../../env/env.js';

const { GITHUB_SECRET, GITHUB_USERNAME } = env;

export const setupGithubResources = ({
  kubProvider,
}: {
  kubProvider?: k8s.Provider;
}) => {
  const githubRegistrySecret = new k8s.core.v1.Secret(
    'github-registry-secret',
    {
      type: 'kubernetes.io/dockerconfigjson',
      metadata: {
        name: 'github-registry-secret',
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
    githubRegistrySecret,
  };
};
