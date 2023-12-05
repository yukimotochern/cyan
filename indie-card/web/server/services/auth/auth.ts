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

const {
  RUN_TIME_GOOGLE_OAUTH_CLIENT_ID,
  RUN_TIME_GOOGLE_OAUTH_CLIENT_SECRET,
  RUN_TIME_NEXTAUTH_SECRET,
  NEXT_PUBLIC_NEXTAUTH_URL,
} = env;

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(orm),
  providers: [
    GoogleProvider({
      clientId: RUN_TIME_GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: RUN_TIME_GOOGLE_OAUTH_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  // callbacks: {
  //   async redirect({ url, baseUrl }) {
  //     console.log('hi', url, baseUrl, NEXT_PUBLIC_NEXTAUTH_URL);
  //     return NEXT_PUBLIC_NEXTAUTH_URL;
  //   },
  // },
  secret: RUN_TIME_NEXTAUTH_SECRET,
  pages: {
    signIn: NEXT_PUBLIC_NEXTAUTH_URL + '/auth/signin',
    signOut: NEXT_PUBLIC_NEXTAUTH_URL + '/auth/signout',
    error: NEXT_PUBLIC_NEXTAUTH_URL + '/auth/error', // Error code passed in query string as ?error=
    verifyRequest: NEXT_PUBLIC_NEXTAUTH_URL + '/auth/verify-request', // (used for check email message)
    newUser: NEXT_PUBLIC_NEXTAUTH_URL + '/auth/new-user', // New users will be directed here on first sign in (leave the property out if not of interest)
  },
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
