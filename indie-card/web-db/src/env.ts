import { z } from 'zod';

export const {
  RUN_TIME_ACTION,
  RUN_TIME_DATABASE_DB_NAME,
  RUN_TIME_DATABASE_HOST,
  RUN_TIME_DATABASE_PASSWORD,
  RUN_TIME_DATABASE_USER,
  RUN_TIME_DATABASE_PORT,
} = z
  .object({
    RUN_TIME_ACTION: z.union([z.literal('migration'), z.literal('none')]),
    RUN_TIME_DATABASE_DB_NAME: z.string().min(1),
    RUN_TIME_DATABASE_HOST: z.string().min(1),
    RUN_TIME_DATABASE_PASSWORD: z.string().min(1),
    RUN_TIME_DATABASE_USER: z.string().min(1),
    RUN_TIME_DATABASE_PORT: z.coerce.number().int(),
  })
  .parse(process.env);
