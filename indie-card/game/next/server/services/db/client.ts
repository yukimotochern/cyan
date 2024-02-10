import { env } from '../../../env/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dbTables from '@cyan/indie-card-game-db';

const {
  DATABASE_DB_NAME,
  DATABASE_HOST,
  DATABASE_PASSWORD,
  DATABASE_USER,
  DATABASE_PORT,
} = env;

export const dbUrl = `postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_DB_NAME}`;

export const orm = drizzle(postgres(dbUrl), { schema: dbTables });
