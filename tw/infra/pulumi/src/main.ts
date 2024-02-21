import { LocalWorkspace, PulumiFn } from '@pulumi/pulumi/automation';
import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { pulumiPrefix, stack, pulumiEnv } from './env/env';
import { setupGithubSecret } from './services/erp/shared/githubSecret';
import { createErpNameSpace } from './services/erp/shared/namespace';
import { simpleGit } from 'simple-git';

const program: PulumiFn = async () => {
  /* Get kubeconfig */
  const stackRef = new pulumi.StackReference(`yukimoto/indie-card/${stack}`);
  const kubeconfig = stackRef.getOutput('kubeConfigOutput');
  const kubProvider = new k8s.Provider(`${pulumiPrefix}-kubeconfig`, {
    kubeconfig,
  });

  /* Erp Scraper */
  const { ns } = createErpNameSpace({ kubProvider });
  const { githubSecret } = setupGithubSecret({ kubProvider, ns });
};

const deploy = async () => {
  const localStack = await LocalWorkspace.createOrSelectStack(
    {
      stackName: stack,
      projectName: 'indie-card',
      program,
    },
    {
      envVars: pulumiEnv,
    },
  );

  const outputs = await localStack.outputs();

  // await localStack.cancel();
  // await localStack.destroy();
  // await localStack.up();
};

deploy();
