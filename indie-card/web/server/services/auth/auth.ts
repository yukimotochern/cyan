import { env } from '../../../env/env';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { type GetServerSidePropsContext } from 'next';
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from 'next-auth';
import { orm } from '../db/client';

const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET } = env;

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(orm),
  providers: [
    GoogleProvider({
      clientId: GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: GOOGLE_OAUTH_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
};

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession['user'];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext['req'];
  res: GetServerSidePropsContext['res'];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
