'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LocaleLandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        router.replace('/companies'); // or your main authenticated route
      } else {
        setChecking(false);
        router.replace('/auth')
      }
    };
    checkUser();
  }, [router]);

  if (checking) return null; // or loading spinner

  return (
    <div />
  );
}
