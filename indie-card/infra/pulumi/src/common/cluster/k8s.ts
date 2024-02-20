import * as pulumi from '@pulumi/pulumi';
import * as eks from '@pulumi/eks';
import * as k8s from '@pulumi/kubernetes';
import * as digitalocean from '@pulumi/digitalocean';
import { logger } from '../../utils/logger';
import { GenericNamingBuilder } from '@cyan/utils-naming';

export const createK8sCluster = ({
  namingBuilder,
  K8S_PROVIDER_NAME,
}: {
  namingBuilder: GenericNamingBuilder;
  K8S_PROVIDER_NAME: string;
}) => {
  let cluster: digitalocean.KubernetesCluster | eks.Cluster;
  let kubeConfigOutput: pulumi.Output<string>;
  let kubProvider: pulumi.ProviderResource | undefined;
  const clusterResource = namingBuilder.resource('k8s-cluster');
  const clusterName = clusterResource.output('pulumiResourceName');

  switch (K8S_PROVIDER_NAME) {
    case 'doks':
      cluster = new digitalocean.KubernetesCluster(clusterName, {
        region: 'sgp1',
        version: '1.29.1-do.0',
        nodePool: {
          name: 'default',
          size: 's-2vcpu-2gb', // https://slugs.do-api.dev/
          nodeCount: 1,
        },
        tags: clusterResource.output('doTags'),
      });
      kubeConfigOutput = cluster.kubeConfigs[0].rawConfig;
      kubProvider = new k8s.Provider(
        namingBuilder.resource('k8s-provider').output('pulumiResourceName'),
        {
          kubeconfig: kubeConfigOutput,
        },
      );
      break;
    case 'eks':
      cluster = new eks.Cluster(clusterName, {
        instanceType: 't3a.medium',
        desiredCapacity: 1,
        maxSize: 1,
        version: '1.29',
        tags: clusterResource.output('awsTags'),
      });
      kubeConfigOutput = cluster.kubeconfigJson;
      kubProvider = new k8s.Provider(
        namingBuilder.resource('k8s-provider').output('pulumiResourceName'),
        {
          kubeconfig: kubeConfigOutput,
        },
      );
      break;
    case 'mini':
      kubeConfigOutput = pulumi.output('Please refer to your local minikube.');
      break;
    default:
      logger.info('No k8s provider is set. Will try to use minikube');
      kubeConfigOutput = pulumi.output('Please refer to your local minikube.');
      break;
  }
  return {
    kubProvider,
    kubeConfigOutput,
  };
};
