import * as pulumi from '@pulumi/pulumi';
import * as eks from '@pulumi/eks';
import * as k8s from '@pulumi/kubernetes';
import * as digitalocean from '@pulumi/digitalocean';
import { appName, serviceName, env } from '../../env/env.js';
import { logger } from '../../utils/logger.js';

const { K8S_PROVIDER_NAME } = env;

export const setupK8sCluster = () => {
  let cluster: digitalocean.KubernetesCluster | eks.Cluster;
  const clusterName = `${appName}-${serviceName}-k8s-cluster`;
  let kubeConfigOutput: pulumi.Output<string>;
  let kubProvider: pulumi.ProviderResource | undefined;
  switch (K8S_PROVIDER_NAME) {
    case 'doks':
      cluster = new digitalocean.KubernetesCluster(clusterName, {
        region: 'sgp1',
        version: '1.28.2-do.0',
        nodePool: {
          name: 'default',
          size: 's-2vcpu-2gb', // https://slugs.do-api.dev/
          nodeCount: 1,
        },
      });
      kubeConfigOutput = cluster.kubeConfigs[0].rawConfig;
      kubProvider = new k8s.Provider('provider', {
        kubeconfig: kubeConfigOutput,
      });
      break;
    case 'eks':
      cluster = new eks.Cluster(clusterName, {
        instanceType: 't3a.medium',
        desiredCapacity: 1,
        maxSize: 1,
        version: '1.28',
      });
      kubeConfigOutput = cluster.kubeconfigJson;
      kubProvider = new k8s.Provider('provider', {
        kubeconfig: kubeConfigOutput,
      });
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
  };
};
