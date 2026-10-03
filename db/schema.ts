import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const attendance=sqliteTable('attendance',{id:text('id').primaryKey(),name:text('name').notNull(),eventDate:text('event_date').notNull(),createdAt:text('created_at').notNull()});
