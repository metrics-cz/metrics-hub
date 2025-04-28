'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import dynamic from 'next/dynamic';

const FirebaseAuth = dynamic(
  () => import('@/components/FirebaseAuth'),
  { ssr: false }
);

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) router.replace('/');        // už je přihlášen → pryč
    });
    return unsub;
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg-light">
      <FirebaseAuth />
    </main>
  );
}
