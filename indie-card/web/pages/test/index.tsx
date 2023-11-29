import React, { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { api } from '../../utils/api';

export default function Index() {
  const { data: session } = useSession();

  const { data, isFetched, refetch } = api.exampleRouter.getTestData.useQuery(
    undefined,
    { trpc: { ssr: false } }
  );
  const createTestData = api.exampleRouter.createTestData.useMutation();
  const [text, setText] = useState('');

  let Data: React.ReactNode = null;

  const handleCreate = async (data: string) => {
    createTestData.mutate({
      data,
    });
    refetch();
  };

  if (isFetched && data) {
    Data = data.map((d) => (
      <div key={d.id}>
        <div>{d.id}</div>
        <div>{d.data}</div>
      </div>
    ));
  }
  if (session) {
    return (
      <>
        Signed in as {session.user?.email} <br />
        {Data}
        <input value={text} onChange={(e) => setText(e.target.value)} />
        <button
          className="m-2 border-cyan-600"
          onClick={() => handleCreate(text)}
        >
          create
        </button>
        <br />
        <button onClick={() => signOut()}>Sign out</button>
      </>
    );
  }
  return (
    <>
      Not signed in <br />
      {Data}
      <button onClick={() => signIn('google')}>Sign in</button>
    </>
  );
}
