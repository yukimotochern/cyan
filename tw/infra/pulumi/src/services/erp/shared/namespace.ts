import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { projectName, stack } from '../../../env/env';
import { serviceName } from './erp.env';

const k8sNamespace = `${projectName}-${stack}-${serviceName}`;

export const createErpNameSpace = ({
  kubProvider,
}: {
  kubProvider?: pulumi.ProviderResource;
}) => {
  const pulumiPrefix = `${serviceName}-namespace`;
  const ns = new k8s.core.v1.Namespace(
    pulumiPrefix,
    {
      metadata: {
        name: k8sNamespace,
      },
    },
    { provider: kubProvider },
  );
  return {
    ns,
  };
};
