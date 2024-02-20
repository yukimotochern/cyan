import * as k8s from '@pulumi/kubernetes';
import { GenericNamingBuilder } from '@cyan/utils-naming';

export const createGameIngress = ({
  kubProvider,
  gameNextSvc,
  clusterIssuer,
  namespace,
  naming,
  isMinikube,
  isDnsReady,
  INDIE_CARD_WEB_HOST_DOMAIN,
}: {
  kubProvider?: k8s.Provider;
  gameNextSvc: k8s.core.v1.Service;
  clusterIssuer?: k8s.apiextensions.CustomResource;
  namespace: k8s.core.v1.Namespace;
  naming: GenericNamingBuilder;
  isMinikube: boolean;
  isDnsReady: boolean;
  INDIE_CARD_WEB_HOST_DOMAIN: string;
}) => {
  if (!isMinikube) {
    const ingressResource = naming.resource('ingress');
    new k8s.networking.v1.Ingress(
      ingressResource.output('pulumiResourceName'),
      {
        metadata: {
          name: ingressResource.output('k8sMetaName'),
          namespace: namespace.metadata.name,
          labels: ingressResource.output('k8sLabel'),
          annotations: {
            'kubernetes.io/ingress.class': 'nginx',
            ...(isDnsReady &&
              clusterIssuer && {
                'cert-manager.io/cluster-issuer': clusterIssuer.metadata.name,
              }),
          },
        },
        spec: {
          ...(isDnsReady && {
            tls: [
              {
                hosts: [INDIE_CARD_WEB_HOST_DOMAIN],
                secretName: 'web-tls-secret',
              },
            ],
          }),
          rules: [
            {
              host: INDIE_CARD_WEB_HOST_DOMAIN,
              http: {
                paths: [
                  {
                    pathType: 'Prefix',
                    path: '/',
                    backend: {
                      service: {
                        name: gameNextSvc.metadata.name,
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
      },
    );
  }
};
