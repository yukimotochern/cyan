import type { Config } from 'drizzle-kit';
import {
  RUN_TIME_DATABASE_DB_NAME,
  RUN_TIME_DATABASE_HOST,
  RUN_TIME_DATABASE_PASSWORD,
  RUN_TIME_DATABASE_USER,
  RUN_TIME_DATABASE_PORT,
} from './env';

export default {
  schema: 'indie-card/web-db-tables/src/index.ts',
  driver: 'pg',
  dbCredentials: {
    user: RUN_TIME_DATABASE_USER,
    host: RUN_TIME_DATABASE_HOST,
    password: RUN_TIME_DATABASE_PASSWORD,
    database: RUN_TIME_DATABASE_DB_NAME,
    port: RUN_TIME_DATABASE_PORT,
  },
  out: 'indie-card/web-db/src/migrations',
  strict: false,
} satisfies Config;
