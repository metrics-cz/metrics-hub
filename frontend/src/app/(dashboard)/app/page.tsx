'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';

/**
 * Když uživatel navštíví / :
 *  – je-li signed-in ➜ /app (dashboard)
 *  – jinak          ➜ /auth
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) =>
      router.replace(u ? '/app' : '/auth'),
    );
    return unsub;
  }, [router]);

  /* nic nezobrazujeme – pouze přesměrujeme */
  return null;
}
