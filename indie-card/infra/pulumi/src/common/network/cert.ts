import * as k8s from '@pulumi/kubernetes';
import { infraEnv, isDnsReady } from '../../env/env';
import { GenericNamingBuilder } from '@cyan/utils-naming';

const { LETS_ENCRYPT_EMAIL } = infraEnv;

export const installCertManager = ({
  kubProvider,
  namingBuilder,
}: {
  kubProvider?: k8s.Provider;
  namingBuilder: GenericNamingBuilder;
}) => {
  let certManagerHelmRelease: k8s.helm.v3.Release | undefined;
  let clusterIssuer: k8s.apiextensions.CustomResource | undefined;
  if (isDnsReady) {
    certManagerHelmRelease = new k8s.helm.v3.Release(
      namingBuilder.resource('helm-cert-manager').output('pulumiResourceName'),
      {
        repositoryOpts: {
          repo: 'https://charts.jetstack.io',
        },
        chart: 'cert-manager',
        version: '1.14.2',
        values: {
          installCRDs: true,
        },
      },
      { provider: kubProvider },
    );

    const clusterIssuerResource = namingBuilder.resource('cluster-issuer');
    const clusterIssuerMetaName = clusterIssuerResource.output('k8sMetaName');
    clusterIssuer = new k8s.apiextensions.CustomResource(
      clusterIssuerResource.output('pulumiResourceName'),
      {
        apiVersion: 'cert-manager.io/v1',
        kind: 'ClusterIssuer',
        metadata: {
          name: clusterIssuerMetaName,
          labels: clusterIssuerResource.output('k8sLabel'),
        },
        spec: {
          acme: {
            email: LETS_ENCRYPT_EMAIL,
            server: 'https://acme-v02.api.letsencrypt.org/directory',
            privateKeySecretRef: {
              name: clusterIssuerMetaName,
            },
            solvers: [
              {
                http01: {
                  ingress: {
                    class: 'nginx',
                  },
                },
              },
            ],
          },
        },
      },
      {
        provider: kubProvider,
        dependsOn: [certManagerHelmRelease],
      },
    );
  }
  return {
    certManagerHelmRelease,
    clusterIssuer,
  };
};
