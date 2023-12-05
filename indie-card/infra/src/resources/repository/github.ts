import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { generalEnv } from '../../env/general.env';

const { INFRA_GITHUB_SECRET, INFRA_GITHUB_USERNAME } = generalEnv;

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
          pulumi.interpolate`${INFRA_GITHUB_USERNAME}:${INFRA_GITHUB_SECRET}`.apply(
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
