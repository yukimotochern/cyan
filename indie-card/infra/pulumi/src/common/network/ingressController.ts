import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { GenericNamingBuilder } from '@cyan/utils-naming';

export const createIngressController = ({
  kubProvider,
  gameDbCluster,
  gameDbServiceName,
  namingBuilder,
  isMinikube,
}: {
  kubProvider?: k8s.Provider;
  gameDbCluster: k8s.apiextensions.CustomResource;
  gameDbServiceName: pulumi.Output<string>;
  namingBuilder: GenericNamingBuilder;
  isMinikube: boolean;
}) => {
  let nginxIngressController: k8s.helm.v3.Release | undefined;
  if (!isMinikube) {
    nginxIngressController = new k8s.helm.v3.Release(
      namingBuilder.resource('ing-ctl').output('pulumiResourceName'),
      {
        repositoryOpts: {
          repo: 'https://kubernetes.github.io/ingress-nginx',
        },
        chart: 'ingress-nginx',
        version: '4.9.1',
        values: {
          controller: {
            service: {
              enabled: true,
              ports: {
                http: 80,
                https: 443,
              },
              targetPorts: {
                http: 'http',
                https: 'https',
              },
            },
          },
          /**
           * Expose TCP see https://github.com/kubernetes/ingress-nginx/blob/main/docs/user-guide/exposing-tcp-udp-services.md
           */
          tcp: {
            7514: pulumi.interpolate`${gameDbCluster.metadata.namespace}/${gameDbServiceName}:5432`,
          },
        },
      },
      {
        provider: kubProvider,
      },
    );
  }
  return {
    nginxIngressController,
  };
};
