import type { Config } from 'drizzle-kit';
import {
  DATABASE_DB_NAME,
  DATABASE_HOST,
  DATABASE_PASSWORD,
  DATABASE_USER,
  DATABASE_PORT,
} from './env';

export default {
  schema: 'tw/erp/db/src/index.ts',
  driver: 'pg',
  dbCredentials: {
    user: DATABASE_USER,
    host: DATABASE_HOST,
    password: DATABASE_PASSWORD,
    database: DATABASE_DB_NAME,
    port: DATABASE_PORT,
  },
  out: 'tw/erp/db-jobs/src/migrations',
  strict: false,
  verbose: true,
} satisfies Config;
