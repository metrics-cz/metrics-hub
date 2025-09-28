'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function LocaleLandingPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || 'en';
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        console.log('User authenticated, redirecting to companies');
        router.replace(`/${locale}/companies`);
      } else {
        console.log('User not authenticated, redirecting to auth');
        router.replace(`/${locale}/auth`);
      }
    }
  }, [user, loading, router, locale]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-gray-900 dark:text-gray-100">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="text-gray-900 dark:text-gray-100">Redirecting...</div>
    </div>
  );
}
