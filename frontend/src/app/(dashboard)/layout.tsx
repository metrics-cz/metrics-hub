// src/app/(dashboard)/layout.tsx
import type { ReactNode } from 'react';
import { CompanyListProvider } from '@/lib/companyList';
import RootLayout from '@/components/layout/RootLayout';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <CompanyListProvider>
      <RootLayout>{children}</RootLayout>
    </CompanyListProvider>
  );
}



