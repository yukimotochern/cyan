import { UpExecutorSchema } from './schema';
import executor from './executor';

const options: UpExecutorSchema = {};

describe('Up Executor', () => {
  it('can run', async () => {
    const output = await executor(options);
    expect(output.success).toBe(true);
  });
});
