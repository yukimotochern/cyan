import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import {
  RUN_TIME_ACTION,
  RUN_TIME_DATABASE_DB_NAME,
  RUN_TIME_DATABASE_HOST,
  RUN_TIME_DATABASE_PASSWORD,
  RUN_TIME_DATABASE_USER,
  RUN_TIME_DATABASE_PORT,
} from './env';
import path from 'path';

export const dbUrl = `postgresql://${RUN_TIME_DATABASE_USER}:${RUN_TIME_DATABASE_PASSWORD}@${RUN_TIME_DATABASE_HOST}:${RUN_TIME_DATABASE_PORT}/${RUN_TIME_DATABASE_DB_NAME}`;
const connection = postgres(dbUrl, { max: 1 });
const orm = drizzle(connection);

if (RUN_TIME_ACTION === 'migration') {
  await migrate(orm, {
    migrationsFolder: path.join(__dirname, 'migrations'),
  });
  console.log('Migration success!');
}
process.exit(0);
