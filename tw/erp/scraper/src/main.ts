import { env } from './env';
import { logger } from './utils';
import dayjs from 'dayjs';
import { sendMsgToTouchWhaleAlertGroup } from './utils';
import { scrapeKeyword } from './modules/keyword';
import { scrapeLiving } from './modules/living';

const { DO_LIVING, DO_KEYWORD } = env;

(async () => {
  logger.info(
    {
      date: dayjs().format('YYYY/MM/DD A h:mm'),
      env: Object.fromEntries(
        Object.entries(env)
          .reduce((pre, [key, val]) => {
            const maskedVal = typeof val === 'string' ? val.slice(0, 4) : val;
            pre.set(key, maskedVal);
            return pre;
          }, new Map())
          .entries(),
      ),
    },
    'Process started with environment variables.',
  );

  let keywordSuccess = true;
  let livingSuccess = true;
  /* Living Scraping */
  if (DO_LIVING) {
    livingSuccess = (await scrapeLiving(logger)).success;
  }

  /* Keyword Scraping */
  if (DO_KEYWORD) {
    keywordSuccess = (await scrapeKeyword(logger)).success;
  }

  try {
    await sendMsgToTouchWhaleAlertGroup(
      keywordSuccess && livingSuccess
        ? '爬蟲成功'
        : `爬蟲失敗，ＱＱ
      居家生活：${livingSuccess ? '成功' : '失敗'}
      關鍵字：${keywordSuccess ? '成功' : '失敗'}`,
    );
  } catch (err) {
    logger.error({ err }, 'Fail to alert to touch whale. QQ~~~');
  }

  logger.info('Process succeeded.');
})();
