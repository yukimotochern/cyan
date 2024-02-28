import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import {
  ACTION,
  DATABASE_DB_NAME,
  DATABASE_HOST,
  DATABASE_PASSWORD,
  DATABASE_USER,
  DATABASE_PORT,
} from './env';
import path from 'path';

console.log('A random change');
export const dbUrl = `postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_DB_NAME}`;
const connection = postgres(dbUrl, { max: 1 });
const orm = drizzle(connection);

if (ACTION === 'migration') {
  await migrate(orm, {
    migrationsFolder: path.join(__dirname, 'migrations'),
  });
  console.log('Migration success!');
}
process.exit(0);
