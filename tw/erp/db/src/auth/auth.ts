import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  serial,
  jsonb,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const userRole = pgEnum('user_role', ['admin', 'worker']);

export const userProfileSchema = z.object({
  姓名: z.string(),
  到職日期: z.string(),
  出生日期: z.string(),
  性別: z.string(),
  班別: z.union([z.literal('正職'), z.literal('計時')]),
  職稱: z.string(),
  上班時間: z.tuple([z.number(), z.number()]),
  身分證號: z.string(),
  聯絡電話: z.string(),
  行動電話: z.string(),
  目前地址: z.string(),
  永久地址: z.string(),
  緊急聯絡人: z.string(),
  緊急聯絡人電話: z.string(),
  人員狀態: z.union([z.literal('任職中'), z.literal('已離職')]),
  離職日期: z.string(),
  就職紀錄: z.array(
    z.object({
      變動種類: z.union([
        z.literal('入職'),
        z.literal('離職'),
        z.literal('轉任'),
      ]),
      日期: z.string(),
      紀錄描述: z.string(),
    }),
  ),
  勞保紀錄: z.array(
    z.object({
      變動種類: z.union([z.literal('入保'), z.literal('退保')]),
      日期: z.string(),
    }),
  ),
  健保紀錄: z.array(
    z.object({
      變動種類: z.union([z.literal('入保'), z.literal('退保')]),
      日期: z.string(),
    }),
  ),
  扶養親屬資料: z.array(
    z.object({
      姓名: z.string(),
      稱謂: z.string(),
      出生日期: z.string(),
      地址: z.string(),
      身分證字號: z.string(),
    }),
  ),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const user = pgTable('user', {
  userNumber: serial('user_number').primaryKey(),
  password: text('password').notNull(),
  role: userRole('role').notNull(),
  profile: jsonb('profile').$type<UserProfile>(),
});

export const userInsertSchema = createInsertSchema(user, {
  profile: userProfileSchema,
});
export const userSelectSchema = createSelectSchema(user, {
  profile: userProfileSchema,
});

export const userSessionRelation = relations(user, ({ many }) => ({
  sessions: many(session),
}));

export type UserRole = (typeof user.$inferInsert)['role'];

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userNumber: integer('user_number')
    .notNull()
    .references(() => user.userNumber),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});

export const sessionUserRelation = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userNumber],
    references: [user.userNumber],
  }),
}));

export const punchRecordType = pgEnum('punch_record_type', [
  '早上上班',
  '午間休息',
  '下午上班',
  '下午下班',
  '晚班上班',
  '晚班下班',
]);

export const punchRecord = pgTable('punch_record', {
  id: serial('id').primaryKey(),
  userNumber: integer('user_number')
    .notNull()
    .references(() => user.userNumber),
  timestamp: timestamp('date', {
    withTimezone: true,
    mode: 'string',
  })
    .notNull()
    .defaultNow(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  })
    .notNull()
    .defaultNow(),
  type: punchRecordType('type').notNull(),
});

export const punchRecordInsertSchema = createInsertSchema(punchRecord);

export const upsertPunchRecordSchema = punchRecordInsertSchema;

export const punchRecordCreateSchema = upsertPunchRecordSchema.pick({
  type: true,
});

export const punchRecordTypeSchema = punchRecordCreateSchema.shape.type;

export type PunchRecordType = z.infer<typeof punchRecordTypeSchema>;

export const punchModificationRequestSchema = z
  .object({
    早上上班: z.string(),
    午間休息: z.string(),
    下午上班: z.string(),
    下午下班: z.string(),
    晚班上班: z.string(),
    晚班下班: z.string(),
  })
  .partial();

export type PunchModificationRequest = z.infer<
  typeof punchModificationRequestSchema
>;

export const punchModification = pgTable('punch_modification', {
  id: serial('id').primaryKey(),
  isSubmitted: boolean('is_submitted').notNull().default(false),
  isApproved: boolean('is_approved').notNull().default(false),
  requestor: integer('requestor')
    .notNull()
    .references(() => user.userNumber),
  request: jsonb('request').$type<PunchModificationRequest>().notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  })
    .notNull()
    .defaultNow(),
});

export const punchModificationCreateSchema = createInsertSchema(
  punchModification,
).pick({ request: true });

export const punchModificationUpdateSchema = createInsertSchema(
  punchModification,
)
  .omit({
    isApproved: true,
    requestor: true,
    createdAt: true,
  })
  .required({ id: true });
