import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import { buildApp } from './app';
import { env } from './env/env';
const server = buildApp();

server.listen(
  {
    port: env.PORT,
    host: env.HOST,
  },
  (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
  },
);
