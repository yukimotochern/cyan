import { setupK8sCluster } from './resources/cluster/k8s';
import { setupCertManger } from './resources/network/cert';
import { setupGithubResources } from './resources/repository/github';
import { setupWebDb } from './services/web-db/webDb';
import { version } from './env/env';
import { setupWebApp } from './services/web/web';

/* Kubernetes Cluster */
export const { kubProvider } = setupK8sCluster();

/* Certificate Manager */
export const certResources = setupCertManger({ kubProvider });

/* Github */
export const { githubRegistrySecret } = setupGithubResources({ kubProvider });

/* Web Db */
export const { webDbServiceName, webDbJob, webDbCluster } = setupWebDb({
  kubProvider,
  githubRegistrySecret,
  certManagerSecret: certResources.certManagerSecret,
  version,
});

/* Web */
export const { webSvc } = setupWebApp({
  kubProvider,
  version,
  githubRegistrySecret,
  webDbCluster,
  webDbJob,
  webDbServiceName,
});

/* Ingres, Ingress Controller, and Certificate */
