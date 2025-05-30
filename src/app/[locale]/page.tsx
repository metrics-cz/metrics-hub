'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useTranslations } from 'next-intl';

export default function LocaleLandingPage() {
  const router = useRouter();
  const t = useTranslations('home');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        router.replace('/companies'); // or your main authenticated route
      } else {
        setChecking(false);
      }
    };
    checkUser();
  }, [router]);

  if (checking) return null; // or loading spinner

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <h1>{t('welcomeMessage')}</h1>
      <p>{t('landingDescription')}</p>
      {/* Links to auth or public pages */}
    </main>
  );
}
