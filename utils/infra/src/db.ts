import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import type { GenericNamingBuilder } from '@cyan/utils-naming';

export const createPostgresDb = ({
  kubProvider,
  certManagerHelmRelease,
  cloudNativePgHelmRelease,
  clusterIssuer,
  namespace,
  namingBuilder,
  POSTGRES_DB,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  isDnsReady,
  INDIE_CARD_WEB_HOST_DOMAIN,
}: {
  kubProvider?: pulumi.ProviderResource;
  githubSecret: k8s.core.v1.Secret;
  certManagerHelmRelease?: k8s.helm.v3.Release;
  clusterIssuer?: k8s.apiextensions.CustomResource;
  cloudNativePgHelmRelease?: k8s.helm.v3.Release;
  namespace: k8s.core.v1.Namespace;
  namingBuilder: GenericNamingBuilder;
  POSTGRES_DB: string;
  POSTGRES_USER: pulumi.Output<string>;
  POSTGRES_PASSWORD: pulumi.Output<string>;
  isDnsReady: boolean;
  INDIE_CARD_WEB_HOST_DOMAIN: string;
}) => {
  /* Db Credentials */
  const dbSecretResource = namingBuilder.resource('pg-secret');
  const dbSecrets = new k8s.core.v1.Secret(
    dbSecretResource.output('pulumiResourceName'),
    {
      metadata: {
        name: namingBuilder.get('component'),
        namespace: namespace.metadata.name,
        labels: dbSecretResource.output('k8sLabel'),
      },
      stringData: {
        username: POSTGRES_USER,
        password: POSTGRES_PASSWORD,
      },
      type: 'kubernetes.io/basic-auth',
    },
    { provider: kubProvider },
  );

  let dbCertSecret: k8s.core.v1.Secret | undefined;

  if (isDnsReady) {
    /* Db Certificate Secret */
    const certSecretResource = namingBuilder.resource('cert-secret');
    dbCertSecret = new k8s.core.v1.Secret(
      certSecretResource.output('pulumiResourceName'),
      {
        metadata: {
          name: certSecretResource.output('k8sMetaName'),
          namespace: namespace.metadata.name,
          labels: {
            'cnpg.io/reload': '',
            ...certSecretResource.output('k8sLabel'),
          },
        },
      },
      {
        provider: kubProvider,
      },
    );

    /* Db Certificate */
    const certResource = namingBuilder.resource('cert');
    new k8s.apiextensions.CustomResource(
      certResource.output('pulumiResourceName'),
      {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Certificate',
        metadata: {
          name: certResource.output('k8sMetaName'),
          namespace: namespace.metadata.name,
          labels: certResource.output('k8sLabel'),
        },
        spec: {
          secretName: dbCertSecret.metadata.name,
          usages: ['server auth'],
          dnsNames: [INDIE_CARD_WEB_HOST_DOMAIN],
          issuerRef: {
            name: clusterIssuer?.metadata.name,
            kind: 'ClusterIssuer',
            group: 'cert-manager.io',
          },
        },
      },
      {
        dependsOn: [
          ...(certManagerHelmRelease ? [certManagerHelmRelease] : []),
          ...(clusterIssuer &&
          clusterIssuer instanceof k8s.apiextensions.CustomResource
            ? [clusterIssuer]
            : []),
        ],
        provider: kubProvider,
      },
    );
  }

  /* CloudNativePG Db Cluster */
  const dbClusterResource = namingBuilder.resource('cluster');
  const dbCluster = new k8s.apiextensions.CustomResource(
    dbClusterResource.output('pulumiResourceName'),
    {
      apiVersion: 'postgresql.cnpg.io/v1',
      kind: 'Cluster',
      metadata: {
        name: dbClusterResource.output('k8sMetaName'),
        namespace: namespace.metadata.name,
        labels: dbClusterResource.output('k8sLabel'),
      },
      spec: {
        instances: 1,
        postgresql: {
          pg_hba:
            isDnsReady && certManagerHelmRelease
              ? [
                  'hostssl all all all scram-sha-256',
                  'host all all all scram-sha-256',
                ]
              : [],
        },
        bootstrap: {
          initdb: {
            database: POSTGRES_DB,
            owner: POSTGRES_USER,
            secret: { name: dbSecrets.metadata.name },
          },
        },
        storage: {
          size: '2Gi',
        },
        ...(isDnsReady &&
          dbCertSecret && {
            certificates: {
              serverTLSSecret: dbCertSecret.metadata.name,
              serverCASecret: dbCertSecret.metadata.name,
            },
          }),
      },
    },
    {
      provider: kubProvider,
      dependsOn: [
        ...(certManagerHelmRelease ? [certManagerHelmRelease] : []),
        ...(cloudNativePgHelmRelease ? [cloudNativePgHelmRelease] : []),
        ...(dbSecrets ? [dbSecrets] : []),
      ],
    },
  );

  return {
    dbCluster,
    // This name is suggested in https://cloudnative-pg.io/documentation/1.21
    dbServiceName: pulumi.interpolate`${dbCluster.metadata.name}-rw`,
  };
};
