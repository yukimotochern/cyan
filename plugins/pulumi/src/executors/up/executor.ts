import { ExecutorContext } from '@nx/devkit';
import { UpExecutorSchema } from './schema';
import { z } from 'zod';

export default async function runExecutor(
  options: UpExecutorSchema,
  context: ExecutorContext,
) {
  const { envVars, stack } = options;
  const { projectName, workspace } = context;
  if (!projectName) {
    throw new Error('Must be run under context of a Nx project.');
  }
  const infraRoot = workspace?.projects[projectName]?.root;
  if (!infraRoot) {
    throw new Error(`Unable to find the root of project ${projectName}.`);
  }

  const envObject = (envVars ?? []).reduce<typeof process.env>(
    (pre, { name, value }) => {
      pre[name] = value;
      return pre;
    },
    process.env,
  );
  const execa = await require('execa');
  try {
    const stackRes = await execa('pulumi', [
      'stack',
      'ls',
      '--cwd',
      infraRoot,
      '--json',
    ]);
    const stacksString = z
      .object({
        stdout: z.string(),
      })
      .parse(stackRes).stdout;
    const stacks = z
      .array(
        z.object({
          name: z.string(),
        }),
      )
      .parse(JSON.parse(stacksString));
    if (!stacks.some((s) => s.name === stack)) {
      await execa('pulumi', ['stack', 'init', stack, '--cwd', infraRoot]);
    }

    const res = await execa(
      'pulumi',
      [
        'up',
        '--refresh',
        '--cwd',
        infraRoot,
        '--yes',
        ...(stack ? ['--stack', stack] : []),
      ],
      {
        stdio: [process.stdin, process.stdout, process.stderr],
        env: envObject,
      },
    );
    if (res.exitCode != 0) {
      console.error(res);
      return { success: false };
    }
  } catch (err) {
    console.error(err);
    return { success: false };
  }
  return {
    success: true,
  };
}
