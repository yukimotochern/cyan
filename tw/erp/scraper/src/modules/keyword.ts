import { sendMsgToTouchWhaleAlertGroup, sleep } from '../utils';
import { getSleepTime, zenRowsRequestor } from '../utils';
import { keywordsSchema, searchItemsDataSchema } from '../schema';

import { Logger, pino } from 'pino';
import axios from 'axios';
import { env } from '../env';

const { API_PATH, KEYWORD_RETRY, DO_KEYWORD, UPLOAD_KEYWORD_TO_SERVER } = env;

const getKeywords = async () => {
  let keywords: string[];
  if (DO_KEYWORD === 'from server') {
    const keywordsResponse = await axios.get(
      API_PATH + '/api/scrapeSchedule/keywords_to_scrape',
    );
    keywords = keywordsSchema.parse(keywordsResponse.data).map((k) => k.name);
  } else {
    keywords = [...DO_KEYWORD.split(',')];
  }
  return keywords;
};

const saveKeywordDataToServer = async ({
  keywordToUse,
  keywordLogger,
  data,
}: {
  keywordToUse: string;
  keywordLogger: pino.Logger;
  data: unknown;
}) => {
  if (UPLOAD_KEYWORD_TO_SERVER) {
    const momoResponse = await axios.post(
      API_PATH + '/api/saveScrapeShopee/keyword',
      {
        keyword: keywordToUse,
        response: data,
      },
    );
    keywordLogger.trace(momoResponse.data);
  }
};

export async function scrapeKeyword(logger: Logger) {
  const keywordLogger = logger.child({}, { msgPrefix: '[Keyword] ' });
  keywordLogger.info('Keyword page started');

  // Get keywords from server or env
  let keywords = await getKeywords();
  const scrapedKeywords = new Set<string>();
  const originalKeywordCount = keywords.length;

  keywordLogger.info({ keywords }, 'Get keywords.');
  let keyword = '';

  for (let j = 0; j < KEYWORD_RETRY; j++) {
    for (let i = 0; i < keywords.length; i++) {
      keyword = keywords[i];
      keywordLogger.trace(`Prepare to go to ${keyword}`);
      const url = `https://shopee.tw/search?keyword=${encodeURIComponent(
        keyword,
      )}`;
      const data = await zenRowsRequestor({
        url,
        xhrBodySchema: searchItemsDataSchema,
        xhrContains: 'v4/search/search_items',
        logger: keywordLogger,
      });
      await saveKeywordDataToServer({
        keywordLogger,
        keywordToUse: keyword,
        data,
      });
      keywordLogger.trace(`Go to ${keyword} successfully.`);
      await sleep(getSleepTime());
    }
    if (scrapedKeywords.size === originalKeywordCount) break;
    // retry
    keywords = await getKeywords();
  }
  // Alert to touch whale if not all keywords scraped
  try {
    if (scrapedKeywords.size !== originalKeywordCount) {
      await sendMsgToTouchWhaleAlertGroup(
        `關鍵字爬蟲結果：${scrapedKeywords.size} / ${originalKeywordCount} 關鍵字，快去看看情況`,
      );
    }
  } catch (err) {
    logger.error({ err }, 'Fail to alert to touch whale');
  }
  return { success: scrapedKeywords.size === originalKeywordCount };
}
