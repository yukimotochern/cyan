import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  serial,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['admin', 'worker']);

export type UserProfile = {
  姓名: string;
  到職日期: string;
  出生日期: string;
  性別: string;
  班別: '正職' | '計時';
  職稱: string;
  上班時間: [number, number];
  身分證號: string;
  聯絡電話: string;
  行動電話: string;
  目前地址: string;
  永久地址: string;
  緊急聯絡人: string;
  緊急聯絡人電話: string;
  人員狀態: '任職中' | '已離職';
  離職日期: string;
  就職紀錄: {
    變動種類: '入職' | '離職' | '轉任';
    日期: string;
    紀錄描述: string;
  }[];
  勞保紀錄: { 變動種類: '入保' | '退保'; 日期: string }[];
  健保紀錄: { 變動種類: '入保' | '退保'; 日期: string }[];
  扶養親屬資料: {
    姓名: string;
    稱謂: string;
    出生日期: string;
    地址: string;
    身分證字號: string;
  }[];
  備註: string;
};

export const userTable = pgTable('user', {
  userNumber: serial('user_number').primaryKey(),
  password: text('password').notNull(),
  role: userRole('role'),
  profile: jsonb('profile').$type<UserProfile>(),
});

export const sessionTable = pgTable('session', {
  id: text('id').primaryKey(),
  userNumber: integer('user_number')
    .notNull()
    .references(() => userTable.userNumber),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});

export const punchRecordType = pgEnum('punch_record_type', [
  '早上上班',
  '午間休息',
  '午間上班',
  '下午下班',
  '晚班上班',
  '晚班下班',
]);

export const punchRecordTable = pgTable('punch_record', {
  userNumber: integer('user_number')
    .notNull()
    .references(() => userTable.userNumber),
  timestamp: timestamp('date', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  type: punchRecordType('type'),
});
