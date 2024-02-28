import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
export { appRouter } from './trpc/trpc.router';
export type { AppRouter } from './trpc/trpc.router';
export { createContext } from './trpc/context';
export type { Context } from './trpc/context';
