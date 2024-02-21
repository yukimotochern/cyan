import { z } from 'zod';
import * as pulumi from '@pulumi/pulumi';
import { simpleGit } from 'simple-git';
import { exec as execSync } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';

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
  CI,
  CIRCLE_BUILD_NUM,
}: {
  outputInfo: ImageOutputInfo;
  versionTagEnv: string;
  nxProjectName: string;
  CI?: string;
  CIRCLE_BUILD_NUM?: string;
}): Promise<{
  outputInfo: ImageOutputInfo;
  versionTagToUse: string;
  buildImage: boolean;
}> => {
  if (!['none', ''].includes(versionTagEnv)) {
    pulumi.log.info(
      `Project ${nxProjectName} use env assigned image tag ${versionTagEnv}.`,
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
  let localBuildNumber = 0;
  if (currentProjectOutput && currentProjectOutput.commitHash) {
    try {
      const { stdout } = await exec(
        `nx show projects --affected --base=${currentProjectOutput.commitHash}`,
      );
      if (!stdout.split('\n').includes(nxProjectName)) {
        pulumi.log.info(
          `Project ${nxProjectName} is not affected. Use existing image. ${JSON.stringify(currentProjectOutput)}`,
        );

        return {
          outputInfo: [currentProjectOutput],
          versionTagToUse: currentProjectOutput.versionTag,
          buildImage: false,
        };
      }
      if (!(CI && CIRCLE_BUILD_NUM)) {
        const match = /^local-(?<localBuildNumber>[0-9]+)/.exec(
          currentProjectOutput.versionTag,
        );
        if (match && match.groups) {
          const parsedNumber = Number(match.groups['localBuildNumber']);
          if (!isNaN(parsedNumber)) localBuildNumber = parsedNumber + 1;
        }
      }
    } catch (err) {
      pulumi.log.error(
        `Unable to run nx command to determine whether the project ${nxProjectName} has changes. It could be that output commit hash does not exist in the local git repo. err: ${err}, output: ${JSON.stringify(currentProjectOutput)}`,
      );
    }
  }

  /* Calculate Version Tag */
  let versionTagToUse: string;
  if (CI && CIRCLE_BUILD_NUM) {
    versionTagToUse = CIRCLE_BUILD_NUM;
  } else {
    versionTagToUse = `local-${localBuildNumber}-${randomUUID().slice(0, 4)}`;
  }

  /* Examine Local Git Repo */
  const result = await simpleGit().status({
    '--porcelain': null,
  });
  pulumi.log.info(`Git status result. ${JSON.stringify(result)}`);
  if (result.files.length !== 0) {
    /* Working tree not clean */
    return {
      outputInfo: [],
      versionTagToUse,
      buildImage: true,
    };
  }
  /* Working tree clean */
  const headCommitHash = await simpleGit().revparse('HEAD');

  return {
    outputInfo: [
      {
        nxProjectName,
        commitHash: headCommitHash,
        versionTag: versionTagToUse,
      },
    ],
    versionTagToUse,
    buildImage: true,
  };
};
