'use client';

import { ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { CompanyListProvider } from '@/lib/companyList';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <CompanyListProvider>
      <div className="flex h-screen bg-bg-light">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </CompanyListProvider>
  );
}
