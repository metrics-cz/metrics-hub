'use client';

import { ReactNode, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { CompanyListProvider } from '@/lib/companyList';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

  if (loading) return <div suppressHydrationWarning>Loading…</div>;
  return (
    <CompanyListProvider>
      <div className="flex h-screen bg-bg-light">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </CompanyListProvider>
  );
}
