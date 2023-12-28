import { LocalWorkspace } from '@pulumi/pulumi/automation';
import { setupK8sCluster } from './resources/cluster/k8s.js';
import { setupCertManger } from './resources/network/cert.js';
import { setupNetwork } from './resources/network/ingress.js';
import { setupGithubResources } from './resources/repository/github.js';
import { setupWebDb } from './services/web-db/webDb.js';
import { setupWebApp } from './services/web/web.js';

const deploy = async () => {
  const stack = await LocalWorkspace.createOrSelectStack({
    stackName: 'dev',
    projectName: 'indie-card',
    program: async () => {
      /* Kubernetes Cluster */
      const { kubProvider } = setupK8sCluster();

      /* Certificate Manager */
      const certResources = setupCertManger({ kubProvider });

      /* Github */
      const { githubRegistrySecret } = setupGithubResources({ kubProvider });

      /* Web Db */
      const { webDbServiceName, webDbJob, webDbCluster } = setupWebDb({
        kubProvider,
        githubRegistrySecret,
        certManagerSecret: certResources.certManagerSecret,
      });

      /* Web */
      const { webSvc } = setupWebApp({
        kubProvider,
        githubRegistrySecret,
        webDbCluster,
        webDbJob,
        webDbServiceName,
      });

      /* Ingres, Ingress Controller, and Certificate */
      setupNetwork({
        ...certResources,
        kubProvider,
        webDbCluster,
        webDbServiceName,
        webSvc,
      });
      return { kubProvider };
    },
  });
};

deploy();
