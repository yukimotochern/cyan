import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { isMinikube, isDnsReady, generalEnv } from '../../env/general.env';
import { stack } from '../../env/env';

const { INFRA_LETS_ENCRYPT_EMAIL, INFRA_INDIE_CARD_WEB_HOST_DOMAIN } =
  generalEnv;

export const setupNetwork = ({
  certManager,
  kubProvider,
  webDbCluster,
  webDbServiceName,
  webSvc,
}: {
  certManager?: k8s.helm.v3.Release;
  certManagerSecret?: pulumi.Output<k8s.core.v1.Secret>;
  kubProvider?: k8s.Provider;
  webDbCluster: k8s.apiextensions.CustomResource;
  webDbServiceName: pulumi.Output<string>;
  webSvc: k8s.core.v1.Service;
}) => {
  if (!isMinikube) {
    const issuerName = `lets-encrypt-${stack}`;
    if (isDnsReady) {
      new k8s.apiextensions.CustomResource(
        'lets-encrypt',
        {
          apiVersion: 'cert-manager.io/v1',
          kind: 'ClusterIssuer',
          metadata: {
            name: issuerName,
          },
          spec: {
            acme: {
              email: INFRA_LETS_ENCRYPT_EMAIL,
              server: 'https://acme-v02.api.letsencrypt.org/directory',
              privateKeySecretRef: {
                name: issuerName,
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
          dependsOn: certManager && [certManager],
        },
      );
    }

    const nginxIngressController = new k8s.helm.v3.Release(
      'ig-controller',
      {
        repositoryOpts: {
          repo: 'https://kubernetes.github.io/ingress-nginx',
        },
        chart: 'ingress-nginx',
        values: {
          controller: {
            service: {
              enabled: true,
              ports: {
                http: 80,
                https: 443,
                tcp: 7514,
              },
              targetPorts: {
                http: 'http',
                https: 'https',
                tcp: 'tcp',
              },
            },
          },
          tcp: {
            7514: pulumi.interpolate`${webDbCluster.metadata.namespace}/${webDbServiceName}:5432`,
          },
        },
      },
      {
        provider: kubProvider,
      },
    );

    new k8s.networking.v1.Ingress(
      'ingress',
      {
        metadata: {
          name: 'ingress',
          annotations: {
            'kubernetes.io/ingress.class': 'nginx',
            ...(isDnsReady && { 'cert-manager.io/cluster-issuer': issuerName }),
          },
        },
        spec: {
          ...(isDnsReady && {
            tls: [
              {
                hosts: [INFRA_INDIE_CARD_WEB_HOST_DOMAIN],
                secretName: 'web-tls-secret',
              },
            ],
          }),
          rules: [
            {
              host: INFRA_INDIE_CARD_WEB_HOST_DOMAIN,
              http: {
                paths: [
                  {
                    pathType: 'Prefix',
                    path: '/',
                    backend: {
                      service: {
                        name: webSvc.metadata.name,
                        port: {
                          number: 80,
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        provider: kubProvider,
        dependsOn: [nginxIngressController],
      },
    );
  }
};
