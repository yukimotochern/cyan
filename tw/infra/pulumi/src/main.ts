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
  createPostgresDb,
} from '@cyan/utils-infra';
import { service as erpService } from './services/erp/shared/erp.env';
import { createScraperCronJob } from './services/erp/scraper/scraper';
import { component as scraperComponent } from './services/erp/scraper/scraper.env';
import { stackOutputSchema } from './utils/stackOutput';
import { erpDbEnv } from './services/erp/db/db.env';

const { GITHUB_REGISTRY, GITHUB_SECRET, GITHUB_USERNAME } = infraEnv;

const { POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER } = erpDbEnv;

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
  const isMinikube = stackRef.getOutput('isMinikube');
  const isDnsReady = (await stackRef.getOutputValue('isDnsReady')) as boolean;
  const INDIE_CARD_WEB_HOST_DOMAIN = (await stackRef.getOutputValue(
    'INDIE_CARD_WEB_HOST_DOMAIN',
  )) as string;
  const clusterIssuer = await stackRef.getOutputValue('clusterIssuer');
  const kubProvider = new k8s.Provider(
    infraService.resource('k8s-provider').output('pulumiResourceName'),
    {
      kubeconfig,
    },
  );

  /* Erp */
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
    isMinikube,
    imageOutputInfo: info,
  });

  /* Erp Db */
  const { dbCluster: erpDbCluster, dbServiceName: erpDbServiceName } =
    createPostgresDb({
      kubProvider,
      githubSecret: erpGithubSecret,
      namespace: erpNs,
      namingBuilder: erpService.component('db'),
      POSTGRES_DB,
      POSTGRES_USER,
      POSTGRES_PASSWORD,
      isDnsReady,
      INDIE_CARD_WEB_HOST_DOMAIN,
      clusterIssuer,
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
