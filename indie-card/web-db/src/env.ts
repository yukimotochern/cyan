import { z } from 'zod';

export const {
  ACTION,
  DATABASE_DB_NAME,
  DATABASE_HOST,
  DATABASE_PASSWORD,
  DATABASE_USER,
  DATABASE_PORT,
} = z
  .object({
    ACTION: z.union([z.literal('migration'), z.literal('none')]),
    DATABASE_DB_NAME: z.string().min(1),
    DATABASE_HOST: z.string().min(1),
    DATABASE_PASSWORD: z.string().min(1),
    DATABASE_USER: z.string().min(1),
    DATABASE_PORT: z.coerce.number().int(),
  })
  .parse(process.env);
