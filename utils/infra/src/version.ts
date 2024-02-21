import { z } from 'zod';
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
  versionTag,
}: {
  outputInfo: ImageOutputInfo;
  versionTag: string;
}) => {
  const r = await exec('nx show projects --affected');
  console.log(r.stdout.split('\n'));
};
