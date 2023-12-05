import { AppProps } from 'next/app';
import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import './global.css';
import { api } from '../utils/api';
import { env } from '../env/env';

function IndieCardGameApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Welcome to web!</title>
      </Head>
      <main className="app">
        <SessionProvider
          session={pageProps.session}
          baseUrl={env.NEXT_PUBLIC_NEXTAUTH_URL}
        >
          <Component {...pageProps} />
        </SessionProvider>
      </main>
    </>
  );
}

export default api.withTRPC(IndieCardGameApp);
