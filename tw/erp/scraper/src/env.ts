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
    maxLivingPage: z
      .string()
      .default('9')
      .transform((s) => parseInt(s)),
    doKeyword: z
      .literal('') // '' means do without keyword
      .or(z.literal('from server'))
      .or(z.string())
      .default('from server'),
    keywordRetry: z
      .string()
      .default('1')
      .transform((s) => parseInt(s)),
    uploadKeywordToServer: defaultTrueTSchema,
    doLiving: defaultTrueTSchema,
    livingRetry: z
      .string()
      .default('1')
      .transform((s) => parseInt(s)),
    uploadLivingToServer: defaultTrueTSchema,
    useAutoDownloadedChrome: defaultTrueTSchema,
    lineChannelAccessToken: z.string(),
    lineTouchWhaleAlertGroupId: z.string(),
    zenRowsToken: z.string(),
  })
  .parse(process.env);
