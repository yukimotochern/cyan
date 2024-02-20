import * as line from '@line/bot-sdk';
import pino from 'pino';
import { ZenRows } from 'zenrows';
import { z } from 'zod';
import { zenRowsSchema } from './schema';

import { env } from './env';

const isDev = process.env['NODE_ENV'] === 'development';

const { lineChannelAccessToken, lineTouchWhaleAlertGroupId } = env;

export const sendMsgToTouchWhaleAlertGroup = async (text: string) => {
  const client = new line.messagingApi.MessagingApiClient({
    channelAccessToken: lineChannelAccessToken,
  });
  client.pushMessage({
    to: lineTouchWhaleAlertGroupId,
    messages: [
      {
        type: 'text',
        text,
      },
    ],
  });
};

export const logger = pino({
  level: 'trace',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        ignore:
          'pid,hostname,time,caller,response(Time,req.hostname,req.remoteAddress,req.remotePort,req.headers.host,req.headers.user-agent,req.headers.accept,req.headers.cache-control,req.headers.postman-token,req.headers.accept-encoding,req.headers.connection,req.headers.accept-language,req.headers.referer,req.headers.sec-fetch-dest,req.headers.sec-fetch-mode,req.headers.sec-fetch-site,req.headers.content-type,req.headers.sec-ch-ua-mobile,req.headers.dnt,req.headers.sec-ch-ua-platform,req.headers.sec-ch-ua,req.headers.pragma,req.headers',
      },
    },
  }),
});

export const sleep = (milliSeconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliSeconds));

const { SLEEP_TIME, zenRowsToken } = env;

export const getSleepTime = () => SLEEP_TIME + Math.random() * SLEEP_TIME;

export const zenRowsRequestor = async ({
  url,
  xhrContains,
  xhrBodySchema,
  logger,
}: {
  url: string;
  xhrContains: string;
  logger: pino.Logger;
  xhrBodySchema: z.ZodTypeAny;
}) => {
  const client = new ZenRows(zenRowsToken);
  const maxRetry = 10;
  for (let retry = 0; retry < maxRetry; retry++) {
    try {
      const { data } = await client.get(url, {
        js_render: true,
        wait: 30000,
        json_response: 'true',
        premium_proxy: true,
        proxy_country: 'tw',
      });
      logger.trace({ url, xhrContains }, 'ZenRows request success.');
      // ZenRows Schema
      const zenRowsData = zenRowsSchema.parse(data);
      // Extract ZenRows Data
      const searchEntry = zenRowsData.xhr.find((data) =>
        data.url.includes(xhrContains),
      );
      if (!searchEntry) {
        const msg = `Unable to find ${xhrContains} in the ZenRows xhr requests.`;
        logger.error({ xhrContains }, msg);
        throw new Error(msg);
      }
      const searchBody = JSON.parse(searchEntry.body);
      logger.trace({ url, xhrContains }, 'ZenRows request data valid.');
      // Pass Shopee Schema
      xhrBodySchema.parse(searchBody);
      logger.trace({ url, xhrContains }, 'Shopee data valid.');
      return searchBody;
    } catch (err) {
      logger.error({ err }, 'ZenRows Error');
      if (retry === maxRetry - 1) {
        throw err;
      }
    }
  }
};
