'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user) {
        router.replace('/auth'); // fallback in case something goes wrong
      } else {
        router.replace('/companies'); // or /app or your default landing
      }
    };

    handleRedirect();
  }, [router]);

  return <p className="text-center mt-20">Probíhá přihlášení…</p>;
}
