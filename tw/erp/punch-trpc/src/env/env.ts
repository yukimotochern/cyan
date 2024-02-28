import { z } from 'zod';

export const env = z
  .object({
    DATABASE_HOST: z.string().min(1),
    DATABASE_USER: z.string().min(1),
    DATABASE_DB_NAME: z.string().min(1),
    DATABASE_PASSWORD: z.string().min(1),
    DATABASE_PORT: z.coerce.number(),
  })
  .parse(process.env);
