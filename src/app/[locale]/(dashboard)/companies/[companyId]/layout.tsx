'use client';
import { BlockingScreen } from '@/components/BlockingScreen';
import { LoadingSpinner } from '@/components/Spinner';
import React, { useEffect } from 'react';
import { useActiveCompany } from '@/lib/activeCompany';
import { useCompanyList } from '@/lib/companyList';
import { updateLastSelectedCompany } from '@/lib/userPreferences';

export default function CompanyLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = React.use(params);
  const company = useActiveCompany();
  const companies = useCompanyList();

  // Save this company as the last selected company when the layout mounts
  useEffect(() => {
    if (companyId) {
      updateLastSelectedCompany(companyId);
    }
  }, [companyId]);

  // Check if user has access to this company
  const hasAccess = companies.some(c => c.id === companyId);
  const isLoading = companies.length === 0; // Still loading company list

  // Show spinner while loading company list
  if (isLoading) {
    return <LoadingSpinner message="Loading company details..." />;
  }

  // Show blocking screen if user doesn't have access to this company
  if (!hasAccess) {
    return <BlockingScreen companyId={companyId} />;
  }

  // Render the actual company layout
  return (
    <div className="flex">
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}