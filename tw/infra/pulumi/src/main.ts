import {
  LocalWorkspace,
  PulumiFn,
  InlineProgramArgs,
  LocalWorkspaceOptions,
} from '@pulumi/pulumi/automation';
import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { service as infraService, pulumiEnv, infraEnv } from './env/env';
import { naming } from '@cyan/utils-naming';
import {
  createNameSpace,
  createGithubSecret,
  ImageOutputInfo,
} from '@cyan/utils-infra';
import { service as erpService } from './services/erp/shared/erp.env';
import { createScraperCronJob } from './services/erp/scraper/scraper';
import { component as scraperComponent } from './services/erp/scraper/scraper.env';
import { stackOutputSchema } from './utils/stackOutput';

const { GITHUB_REGISTRY, GITHUB_SECRET, GITHUB_USERNAME } = infraEnv;

const stackName = infraService.get('stack');

const program = (async (info: ImageOutputInfo = []) => {
  const indieCard = naming
    .organization('Yukimotochern')
    .project('indie-card')
    .stack(infraService.get('stack'));

  /* Get kubeconfig */
  const stackRef = new pulumi.StackReference(
    indieCard.output('pulumiStackReference'),
  );
  const kubeconfig = stackRef.getOutput('kubeConfigOutput');
  const isMinikubeFromOutput = stackRef.getOutput('isMinikube');
  isMinikubeFromOutput.apply((str) => pulumi.log.info(`${typeof str} ${str}`));
  const isMinikube = false;
  const kubProvider = new k8s.Provider(
    infraService.resource('k8s-provider').output('pulumiResourceName'),
    {
      kubeconfig,
    },
  );

  /* Erp Scraper */
  const { ns: erpNs } = createNameSpace({
    kubProvider,
    namingBuilder: erpService,
  });

  const { githubSecret: erpGithubSecret } = createGithubSecret({
    kubProvider,
    namingBuilder: erpService.component('github'),
    namespace: erpNs,
    GITHUB_SECRET,
    GITHUB_USERNAME,
  });

  const { outputInfo: scraperOutput } = await createScraperCronJob({
    kubProvider,
    githubSecret: erpGithubSecret,
    namespace: erpNs,
    namingBuilder: scraperComponent,
    GITHUB_USERNAME,
    GITHUB_SECRET,
    GITHUB_REGISTRY,
    isMinikube: !!isMinikube,
    imageOutputInfo: info,
  });
  return { imageOutputInfo: [...scraperOutput], isMinikube };
}) satisfies PulumiFn;

const deploy = async () => {
  const inlineProgram: InlineProgramArgs = {
    stackName,
    projectName: 'tw',
    program,
  };
  const localWorkspaceOptions: LocalWorkspaceOptions = {
    envVars: pulumiEnv,
  };
  let localStack = await LocalWorkspace.createOrSelectStack(
    inlineProgram,
    localWorkspaceOptions,
  );
  const outputs = await localStack.outputs();
  const result = stackOutputSchema.parse(outputs);
  const imageOutputInfo = result.imageOutputInfo?.value;
  localStack = await LocalWorkspace.createOrSelectStack(
    {
      ...inlineProgram,
      program: () => program(imageOutputInfo),
    },
    localWorkspaceOptions,
  );

  // await localStack.cancel({ onOutput: console.info });
  // await localStack.destroy({ onOutput: console.info });
  await localStack.up({ onOutput: console.info });
  // await localStack.preview({ onOutput: console.info });
};

deploy();
