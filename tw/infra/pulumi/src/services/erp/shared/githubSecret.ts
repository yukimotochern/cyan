import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { infraEnv } from '../../../env/env';
import { serviceName } from './erp.env';

const { GITHUB_SECRET, GITHUB_USERNAME } = infraEnv;

export const setupGithubSecret = ({
  kubProvider,
  ns,
}: {
  kubProvider?: k8s.Provider;
  ns: k8s.core.v1.Namespace;
}) => {
  const componentName = 'github';
  const pulumiPrefix = `${serviceName}-${componentName}`;

  const githubSecret = new k8s.core.v1.Secret(
    `${pulumiPrefix}-secret`,
    {
      type: 'kubernetes.io/dockerconfigjson',
      metadata: {
        name: 'github-secret',
        namespace: ns.metadata.name,
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
