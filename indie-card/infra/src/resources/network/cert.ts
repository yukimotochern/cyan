import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { isDnsReady, isCertificateReady } from '../../env/general.env';

export const setupCertManger = ({
  kubProvider,
}: {
  kubProvider?: k8s.Provider;
}) => {
  const certResources: {
    certManager?: k8s.helm.v3.Release;
    certManagerSecret?: pulumi.Output<k8s.core.v1.Secret>;
  } = {};
  if (isDnsReady) {
    // helm install cert-manager jetstack/cert-manager --namespace cert-manager --version v1.10.1 --set installCRDs=true
    certResources.certManager = new k8s.helm.v3.Release(
      'cert-manager',
      {
        repositoryOpts: {
          repo: 'https://charts.jetstack.io',
        },
        chart: 'cert-manager',
        values: {
          version: 'v1.31.1',
          installCRDs: true,
        },
      },
      { provider: kubProvider },
    );
    if (isCertificateReady) {
      certResources.certManagerSecret =
        pulumi.interpolate`${certResources.certManager.name}-webhook-ca`.apply(
          (certManagerSecretName) =>
            k8s.core.v1.Secret.get(
              certManagerSecretName,
              `default/${certManagerSecretName}`,
              { provider: kubProvider },
            ),
        );
    }
  }
  return {
    ...certResources,
  };
};
