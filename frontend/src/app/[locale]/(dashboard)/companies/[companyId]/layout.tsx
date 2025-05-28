// /companies/[companyId]/layout.tsx
'use client';
import { getCompanyById } from '@/lib/firebase/firebaseData';
import { BlockingScreen } from '@/components/BlockingScreen';
import React from 'react';


export default function CompanyLayout({ children, params }: { children: React.ReactNode; params: Promise<{ companyId: string }> }) {
  const { companyId } = React.use(params);
  const company = getCompanyById(companyId);

  if (!company) {
    return <BlockingScreen companyId={companyId} />;
  }

  return (
    <div className="flex">
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
