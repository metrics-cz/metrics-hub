'use client';

import { ReactNode, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { CompanyListProvider, useCompanyListLoading } from '@/lib/companyList';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import ErrorBoundary from '@/components/ErrorBoundary';

function LoadingSpinner() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function DashboardContent({ children }: { children: ReactNode }) {
  const loading = useCompanyListLoading();

  // Show loading spinner while fetching companies
  if (loading) {
    return <LoadingSpinner />;
  }

  // Always show normal dashboard layout once loading is complete
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-600">
      <Sidebar />
      <main className="flex-1 overflow-auto text-gray-900 dark:text-gray-100">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

  if (loading) return <LoadingSpinner />;

  return (
    <ErrorBoundary>
      <CompanyListProvider>
        <ErrorBoundary>
          <NotificationProvider>
            <DashboardContent>{children}</DashboardContent>
          </NotificationProvider>
        </ErrorBoundary>
      </CompanyListProvider>
    </ErrorBoundary>
  );
}
