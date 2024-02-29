import { z } from 'zod';
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
  createPostgresDb,
} from '@cyan/utils-infra';
import { service as erpService } from './services/erp/shared/erp.env';
import { createScraperCronJob } from './services/erp/scraper/scraper';
import { component as scraperComponent } from './services/erp/scraper/scraper.env';
import { component as erpDbJobsComponent } from './services/erp/db-jobs/db-jobs.env';
import { stackOutputSchema } from './utils/stackOutput';
import { erpDbEnv } from './services/erp/db/db.env';
import { createErpDbJobs } from './services/erp/db-jobs/db-jobs';

const { GITHUB_REGISTRY, GITHUB_SECRET, GITHUB_USERNAME } = infraEnv;

const { POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER } = erpDbEnv;

const stackName = infraService.get('stack');

const program = (async (output: z.infer<typeof stackOutputSchema> = {}) => {
  const indieCard = naming
    .organization('Yukimotochern')
    .project('indie-card')
    .stack(stackName);

  /* Get kubeconfig */
  const stackRef = new pulumi.StackReference(
    indieCard.output('pulumiStackReference'),
  );
  const kubeconfig = stackRef.getOutput('kubeConfigOutput');
  const isMinikube = await stackRef.getOutputValue('isMinikube');
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
  /* Erp Namespace */
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
    versionHistory: output['tw-erp-scraper']?.value,
  });

  /* Erp Db */
  const { dbCluster: erpDbCluster, dbServiceName: erpDbServiceName } =
    createPostgresDb({
      kubProvider,
      githubSecret: erpGithubSecret,
      clusterIssuer,
      namespace: erpNs,
      namingBuilder: erpService.component('db'),
      POSTGRES_DB,
      POSTGRES_USER,
      POSTGRES_PASSWORD,
      isDnsReady,
      INDIE_CARD_WEB_HOST_DOMAIN,
    });

  /* Erp Db Jobs */
  const { dbJobs, outputInfo: erpDbJobsOutputInfo } = await createErpDbJobs({
    kubProvider,
    dbCluster: erpDbCluster,
    dbServiceName: erpDbServiceName,
    namespace: erpNs,
    namingBuilder: erpDbJobsComponent,
    githubSecret: erpGithubSecret,
    GITHUB_REGISTRY,
    GITHUB_SECRET,
    GITHUB_USERNAME,
    isMinikube,
    versionHistory: output['tw-erp-db-jobs']?.value,
  });

  /* Erp Punch Fastify */

  return {
    isMinikube,
    'tw-erp-scraper': scraperOutput,
    'tw-erp-db-jobs': erpDbJobsOutputInfo,
  };
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
  localStack = await LocalWorkspace.createOrSelectStack(
    {
      ...inlineProgram,
      program: () => program(result),
    },
    localWorkspaceOptions,
  );

  // await localStack.cancel({ onOutput: console.info });
  // await localStack.destroy({ onOutput: console.info });
  await localStack.up({ onOutput: console.info });
  // await localStack.preview({ onOutput: console.info });
};

deploy();
