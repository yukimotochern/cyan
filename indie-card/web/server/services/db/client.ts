import { env } from '../../../env/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dbTables from '@cyan/indie-card/web-db-tables';

const {
  RUN_TIME_DATABASE_DB_NAME,
  RUN_TIME_DATABASE_HOST,
  RUN_TIME_DATABASE_PASSWORD,
  RUN_TIME_DATABASE_USER,
  RUN_TIME_DATABASE_PORT,
} = env;

export const dbUrl = `postgresql://${RUN_TIME_DATABASE_USER}:${RUN_TIME_DATABASE_PASSWORD}@${RUN_TIME_DATABASE_HOST}:${RUN_TIME_DATABASE_PORT}/${RUN_TIME_DATABASE_DB_NAME}`;

export const orm = drizzle(postgres(dbUrl), { schema: dbTables });
