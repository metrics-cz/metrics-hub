'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function IndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/en/auth');
      } else {
        router.replace('/en/companies');
      }
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace('/en/auth');
      } else {
        router.replace('/en/companies');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
