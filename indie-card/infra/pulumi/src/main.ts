import {
  InlineProgramArgs,
  LocalWorkspace,
  LocalWorkspaceOptions,
  PulumiFn,
} from '@pulumi/pulumi/automation';
import {
  createNameSpace,
  createGithubSecret,
  createPostgresDb,
  ImageOutputInfo,
} from '@cyan/utils-infra';

import { createK8sCluster } from './common/cluster/k8s';
import { installCloudNativePG } from './common/postgres/cloudNativePG';
import { installCertManager } from './common/network/cert';
import { createGameDbJobs } from './services/game/db-jobs/db-jobs';
import { createGameNextApp } from './services/game/next/game-next';
import { createIngressController } from './common/network/ingressController';
import { createGameIngress } from './services/game/shared/ingress';

import {
  stack,
  service as infraService,
  pulumiEnv,
  infraEnv,
  isDnsReady,
  isMinikube,
} from './env/env';
import { service as gameService } from './services/game/shared/game.env';
import { gameDbEnv } from './services/game/db/db.env';
import { component as gameDbJobsComponent } from './services/game/db-jobs/db-jobs.env';
import { component as gameNextComponent } from './services/game/next/game-next.env';
import { stackOutputSchema } from './utils/stackOutput';

const stackName = stack.get('stack');
const {
  GITHUB_SECRET,
  GITHUB_USERNAME,
  GITHUB_REGISTRY,
  INDIE_CARD_WEB_HOST_DOMAIN,
  K8S_PROVIDER_NAME,
} = infraEnv;
const { POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD } = gameDbEnv;

const program = (async (info: ImageOutputInfo = []) => {
  /* Kubernetes Cluster */
  const { kubProvider, kubeConfigOutput } = createK8sCluster({
    K8S_PROVIDER_NAME,
    namingBuilder: infraService,
  });

  /* CloudNative PG */
  const { cloudNativePgHelmRelease } = installCloudNativePG({
    kubProvider,
    namingBuilder: infraService,
  });

  /* Certificate Manager */
  const { certManagerHelmRelease, clusterIssuer } = installCertManager({
    kubProvider,
    namingBuilder: infraService,
  });

  /* Game */
  /* Game Namespace */
  const { ns: gameNs } = createNameSpace({
    kubProvider,
    namingBuilder: gameService,
  });

  /* Game Github */
  const { githubSecret: gameGithubSecret } = createGithubSecret({
    kubProvider,
    namingBuilder: gameService.component('github'),
    namespace: gameNs,
    GITHUB_SECRET,
    GITHUB_USERNAME,
  });

  /* Game Db */
  const { dbCluster: gameDbCluster, dbServiceName: gameDbServiceName } =
    createPostgresDb({
      kubProvider,
      githubSecret: gameGithubSecret,
      certManagerHelmRelease,
      cloudNativePgHelmRelease,
      clusterIssuer,
      namespace: gameNs,
      namingBuilder: gameService.component('db'),
      POSTGRES_DB,
      POSTGRES_USER,
      POSTGRES_PASSWORD,
      isDnsReady,
      INDIE_CARD_WEB_HOST_DOMAIN,
    });

  /* Game Db Jobs */
  const { gameDbJobs, outputInfo: gameDbJobsOutputInfo } =
    await createGameDbJobs({
      kubProvider,
      gameDbCluster,
      gameDbServiceName,
      namespace: gameNs,
      namingBuilder: gameDbJobsComponent,
      githubSecret: gameGithubSecret,
      GITHUB_REGISTRY,
      GITHUB_SECRET,
      GITHUB_USERNAME,
      isMinikube,
      imageOutputInfo: info,
    });

  /* Game Next */
  const { gameNextSvc, outputInfo: gameNextOutputInfo } =
    await createGameNextApp({
      kubProvider,
      gameDbCluster,
      gameDbServiceName,
      gameDbJobs,
      namespace: gameNs,
      namingBuilder: gameNextComponent,
      githubSecret: gameGithubSecret,
      GITHUB_REGISTRY,
      GITHUB_SECRET,
      GITHUB_USERNAME,
      isMinikube,
      imageOutputInfo: info,
    });

  /* Ingress Controller */
  createIngressController({
    kubProvider,
    gameDbCluster,
    gameDbServiceName,
    namingBuilder: infraService,
    isMinikube,
  });

  /* Game Ingres and Certificate */
  createGameIngress({
    kubProvider,
    gameNextSvc,
    clusterIssuer,
    namespace: gameNs,
    namingBuilder: gameService,
    isMinikube,
    isDnsReady,
    INDIE_CARD_WEB_HOST_DOMAIN,
  });

  return {
    kubeConfigOutput,
    imageOutputInfo: [...gameDbJobsOutputInfo, ...gameNextOutputInfo],
  };
}) satisfies PulumiFn;

const deploy = async () => {
  const inlineProgram: InlineProgramArgs = {
    stackName,
    projectName: 'indie-card',
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
