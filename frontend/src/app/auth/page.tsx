'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import AuthCard from '@/features/auth/AuthCard';

export default function AuthPage() {
  const router = useRouter();

  /* už je přihlášen → domů */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => u && router.replace('/app'));
    return unsub;
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg-light px-4 animate-fade">
      <AuthCard />
    </main>
  );
}
