import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { GenericNamingBuilder } from '@cyan/utils-naming';

export const installCloudNativePG = ({
  kubProvider,
  namingBuilder,
}: {
  kubProvider?: pulumi.ProviderResource;
  namingBuilder: GenericNamingBuilder;
}) => {
  /**
   * Install CloudNativePG
   *  - Installation: https://cloudnative-pg.io/documentation/1.22/installation_upgrade/
   */
  const cloudNativePgHelmRelease = new k8s.helm.v3.Release(
    namingBuilder.resource('cnpg').output('pulumiResourceName'),
    {
      repositoryOpts: {
        repo: 'https://cloudnative-pg.github.io/charts',
      },
      chart: 'cloudnative-pg',
      version: '0.20.1',
      namespace: 'cnpg-system',
      createNamespace: true,
    },
    {
      provider: kubProvider,
    },
  );
  return {
    cloudNativePgHelmRelease,
  };
};
