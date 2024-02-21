import { z } from 'zod';
import { Logger } from 'pino';
import { simpleGit } from 'simple-git';
import { exec as execSync } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execSync);

export const versionHistoryInfo = z.object({
  nxProjectName: z.string(),
  commitHash: z.string(),
  versionTag: z.string(),
});

export const imageOutputInfo = z.array(versionHistoryInfo);

export type ImageOutputInfo = z.infer<typeof imageOutputInfo>;

export const getImageVersionByStackOutputGitAndVersionEnv = async ({
  outputInfo,
  versionTagEnv,
  nxProjectName,
  logger,
}: {
  outputInfo: ImageOutputInfo;
  versionTagEnv: string;
  nxProjectName: string;
  logger: Logger;
}) => {
  console.log('ran');
  logger.info({}, 'hi');
  if (!['none', ''].includes(versionTagEnv)) {
    logger.trace(
      {
        nxProjectName,
        versionTagEnv,
      },
      'Project use env assigned image tag.',
    );
    return {
      outputInfo: [],
      versionTagToUse: versionTagEnv,
      buildImage: false,
    };
  }
  const currentProjectOutput = outputInfo.find(
    (info) => info.nxProjectName === nxProjectName,
  );
  if (currentProjectOutput && currentProjectOutput.commitHash) {
    try {
      const { stdout } = await exec(
        `nx show projects --affected --base=${currentProjectOutput.commitHash}`,
      );
      if (!stdout.split('\n').includes(nxProjectName)) {
        logger.trace(
          {
            nxProjectName,
            currentProjectOutput,
          },
          'Project is not affected. Use existing image.',
        );
        return {
          outputInfo: currentProjectOutput,
          versionTagToUse: currentProjectOutput.versionTag,
          buildImage: false,
        };
      }
    } catch (err) {
      logger.error(
        {
          currentProjectOutput,
          err,
        },
        'Unable to run nx command to determine whether the project has changes. It could be that output commit hash does not exist in the local git repo.',
      );
    }
  }
  const result = await simpleGit().status({
    '--porcelain': null,
  });
  logger.trace(
    {
      result,
      typeofResult: typeof result,
    },
    'result',
  );
  return '';

  // console.log(r.stdout.split('\n'));
  // console.log(r.stderr);
};
