'use client';

import { useEffect, useRef } from 'react';
import { useRouter }         from 'next/navigation';
import * as firebaseui       from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';
import { auth }              from '@/lib/firebaseClient';

export default function FirebaseAuth() {
  const uiRef = useRef<firebaseui.auth.AuthUI | null>(null);
  const router = useRouter();

  useEffect(() => {
    // singletone
    if (!uiRef.current) uiRef.current = new firebaseui.auth.AuthUI(auth);

    uiRef.current.start('#firebase-ui', {
      signInOptions: [{ provider: 'password' }],
      callbacks: {
        signInSuccessWithAuthResult: () => {
          router.push('/');      // ←  po loginu domů
          return false;          //   ať se UI ne-refreshuje
        },
      },
    });

    return () => uiRef.current?.reset();
  }, [router]);

  return <div id="firebase-ui" />;
}
