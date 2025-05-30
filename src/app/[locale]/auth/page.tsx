'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AuthCard from '@/features/auth/AuthCard';
import { useLocale } from 'next-intl';

export default function AuthPage() {
  const router = useRouter();
  const locale = useLocale();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        router.replace(`/${locale}/companies`);
      } else {
        setChecking(false); // only show auth screen after this
      }
    };

    check();
  }, [router]);

  if (checking) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg-light px-4 animate-fade">
      <AuthCard />
    </main>
  );
}
