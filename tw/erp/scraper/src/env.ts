import { z } from 'zod';

const defaultTrueTSchema = z
  .string()
  .default('true')
  .transform((s) => s === 'true');

export const env = z
  .object({
    SLEEP_TIME: z
      .string()
      .default('15000')
      .transform((str) => parseInt(str)),
    API_PATH: z.string().url().default('https://momotouch.click'),
    MAX_LIVING_PAGE: z
      .string()
      .default('9')
      .transform((s) => parseInt(s)),
    DO_KEYWORD: z
      .literal('') // '' means do without keyword
      .or(z.literal('from server'))
      .or(z.string())
      .default('from server'),
    KEYWORD_RETRY: z
      .string()
      .default('1')
      .transform((s) => parseInt(s)),
    UPLOAD_KEYWORD_TO_SERVER: defaultTrueTSchema,
    DO_LIVING: defaultTrueTSchema,
    LIVING_RETRY: z
      .string()
      .default('1')
      .transform((s) => parseInt(s)),
    UPLOAD_LIVING_TO_SERVER: defaultTrueTSchema,
    LINE_CHANNEL_ACCESS_TOKEN: z.string(),
    LINE_TOUCH_WHALE_ALERT_GROUP_ID: z.string(),
    ZENROWS_TOKEN: z.string(),
  })
  .parse(process.env);
