import type { Config } from 'drizzle-kit';
import {
  DATABASE_DB_NAME,
  DATABASE_HOST,
  DATABASE_PASSWORD,
  DATABASE_USER,
  DATABASE_PORT,
} from './env';

export default {
  schema: 'indie-card/web-db-tables/src/index.ts',
  driver: 'pg',
  dbCredentials: {
    user: DATABASE_USER,
    host: DATABASE_HOST,
    password: DATABASE_PASSWORD,
    database: DATABASE_DB_NAME,
    port: DATABASE_PORT,
  },
  out: 'indie-card/web-db/src/migrations',
  strict: false,
} satisfies Config;
