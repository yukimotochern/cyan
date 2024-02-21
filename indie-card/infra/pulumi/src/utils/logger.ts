import pino from 'pino';
import pinoCaller from 'pino-caller';

export const logger = pinoCaller(
  pino({
    level: 'trace',
    ...(process.env.NODE_ENV !== 'production' && {
      transport: {
        target: 'pino-pretty',
      },
    }),
  }),
  {
    relativeTo: process.cwd(),
  },
);
