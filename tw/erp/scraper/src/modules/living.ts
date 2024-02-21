import {
  sleep,
  sendMsgToTouchWhaleAlertGroup,
  getSleepTime,
  zenRowsRequestor,
} from '../utils';
import { SearchItemsDataCollector, searchItemsDataSchema } from '../schema';
import { Logger } from 'pino';
import axios from 'axios';
import { env } from '../env';

const { API_PATH, MAX_LIVING_PAGE, LIVING_RETRY, UPLOAD_LIVING_TO_SERVER } =
  env;

export async function scrapeLiving(logger: Logger) {
  const livingLogger = logger.child({}, { msgPrefix: '[Living] ' });
  livingLogger.info('Living started');
  let livingData: SearchItemsDataCollector = {
    shouldContinue: true,
    data: [],
    scrapedPageCount: 0,
  };
  for (let j = 0; j < LIVING_RETRY; j++) {
    for (let i = 0; i < MAX_LIVING_PAGE; i++) {
      if (!livingData.shouldContinue) break;
      livingLogger.info(
        {
          attempt: ` on ${j}th retry, ${i}th page`,
          ...livingData,
          data: undefined,
        },
        `Prepare to scrape page ${i}`,
      );
      try {
        const url = `https://shopee.tw/%E5%B1%85%E5%AE%B6%E7%94%9F%E6%B4%BB-cat.11040925?page=${i}&sortBy=sales`;
        try {
          const data = await zenRowsRequestor({
            url,
            xhrContains: 'v4/search/search_items',
            xhrBodySchema: searchItemsDataSchema,
            logger,
          });
          if (data.items.length === 0) {
            livingLogger.trace('No more data');
            throw new Error('No more data');
          }
          livingData.scrapedPageCount++;
          livingData.data.push(data);
          livingLogger.trace({ count: data.items.length }, 'Receive data.');
        } catch (err) {
          livingLogger.error({ err }, 'Stop with error.');
          livingData.shouldContinue = false;
        }
      } catch (err) {
        livingLogger.error({ err });
        break;
      }
      await sleep(getSleepTime());
    }
    if (livingData.scrapedPageCount === MAX_LIVING_PAGE) {
      break;
    }
    livingData = {
      ...livingData,
      data: [],
      scrapedPageCount: 0,
    };
  }

  livingLogger.info(
    { totalLivingPageCount: livingData.data.length },
    'Final result',
  );

  if (UPLOAD_LIVING_TO_SERVER) {
    try {
      const momoResponse = await axios.post(
        API_PATH + '/api/saveScrapeShopee/living',
        livingData.data,
      );
      livingLogger.info(momoResponse.data);
    } catch (err) {
      livingLogger.error(
        {
          livingData,
          err,
        },
        'Fail to save living response',
      );
    }
  }
  // Alert to touch whale if not all keywords scraped
  try {
    if (livingData.scrapedPageCount !== MAX_LIVING_PAGE) {
      await sendMsgToTouchWhaleAlertGroup(
        `居家生活爬蟲結果：${livingData.scrapedPageCount} / ${MAX_LIVING_PAGE}頁，快去看看怎麼了～～`,
      );
    }
  } catch (err) {
    logger.error({ err }, 'Fail to alert to touch whale');
  }
  return { success: livingData.scrapedPageCount === MAX_LIVING_PAGE };
}
