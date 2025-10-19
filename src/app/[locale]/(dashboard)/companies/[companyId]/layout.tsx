'use client';
import { BlockingScreen } from '@/components/common/BlockingScreen';
import { LoadingSpinner } from '@/components/common/Spinner';
import React from 'react';
import { useActiveCompany } from '@/lib/activeCompany';
import { useCompanyList } from '@/lib/companyList';

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

  // Note: Removed updateLastSelectedCompany call to prevent AuthApiError crashes
  // This was a non-critical feature that was causing authentication errors

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