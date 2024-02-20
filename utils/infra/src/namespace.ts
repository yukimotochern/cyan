import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import type { GenericNamingBuilder } from '@cyan/utils-naming';

export const createNameSpace = ({
  kubProvider,
  namingBuilder,
}: {
  kubProvider?: pulumi.ProviderResource;
  namingBuilder: GenericNamingBuilder;
}) => {
  const resource = namingBuilder.resource('namespace');
  const ns = new k8s.core.v1.Namespace(
    resource.output('pulumiResourceName'),
    {
      metadata: {
        name: resource.output('k8sNamespace'),
        labels: resource.output('k8sLabel'),
      },
    },
    { provider: kubProvider },
  );
  return {
    ns,
  };
};
