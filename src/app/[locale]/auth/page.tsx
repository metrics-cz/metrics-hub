'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AuthCard from '@/features/auth/AuthCard';
import { useLocale } from 'next-intl';
import ThemeToggle from '@/components/ThemeToggle';

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
    <main className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4 animate-fade relative text-gray-900 dark:text-gray-100">
      {/* Theme toggle in top-right corner */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle collapsed={true} position="auth-page" />
      </div>
      <AuthCard />
    </main>
  );
}
