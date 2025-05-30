// /companies/[companyId]/layout.tsx
'use client';
import { getCompanyById } from '@/lib/company/getCompanyById';
import { BlockingScreen } from '@/components/BlockingScreen';
import React, { useEffect, useState } from 'react';
import { Company } from '@/lib/validation/companySchema';


export default function CompanyLayout({ children, params }: { children: React.ReactNode; params: Promise<{ companyId: string }> }) {
  const { companyId } = React.use(params);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    getCompanyById(companyId).then(setCompany);
  }, [companyId]);

  if (!company) {
    return <BlockingScreen companyId={companyId} />;
  }

  return (
    <div className="flex">
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
