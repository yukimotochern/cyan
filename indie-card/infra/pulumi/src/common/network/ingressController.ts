import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { GenericNamingBuilder } from '@cyan/utils-naming';

export const createIngressController = ({
  kubProvider,
  gameDbCluster,
  gameDbServiceName,
  naming,
  isMinikube,
}: {
  kubProvider?: k8s.Provider;
  gameDbCluster: k8s.apiextensions.CustomResource;
  gameDbServiceName: pulumi.Output<string>;
  naming: GenericNamingBuilder;
  isMinikube: boolean;
}) => {
  let nginxIngressController: k8s.helm.v3.Release | undefined;
  if (!isMinikube) {
    nginxIngressController = new k8s.helm.v3.Release(
      naming.resource('ing-ctl').output('pulumiResourceName'),
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
