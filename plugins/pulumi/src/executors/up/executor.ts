import { UpExecutorSchema } from './schema';

export default async function runExecutor(options: UpExecutorSchema) {
  console.log('Executor ran for Up', options);
  return {
    success: true,
  };
}
