import { text, pgTable } from 'drizzle-orm/pg-core';

export const testData = pgTable('testData', {
  id: text('id').notNull().primaryKey(),
  data: text('data'),
});
