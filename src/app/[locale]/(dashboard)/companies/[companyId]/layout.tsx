'use client';
import { getCompanyById, CompanyError } from '@/lib/company/getCompanyById';
import { BlockingScreen } from '@/components/BlockingScreen';
import { LoadingSpinner } from '@/components/Spinner';
import React, { useEffect, useState } from 'react';
import { Company } from '@/lib/validation/companySchema';

export default function CompanyLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = React.use(params);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<CompanyError | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const companyData = await getCompanyById(companyId);
        setCompany(companyData);
      } catch (err) {
        console.error('Error fetching company:', err);
        if (err instanceof CompanyError) {
          setError(err);
        } else {
          setError(new CompanyError(
            err instanceof Error ? err.message : 'Failed to load company',
            'UNKNOWN'
          ));
        }
        setCompany(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [companyId]);

  // Show spinner while loading
  if (isLoading) {
    return <LoadingSpinner message="Loading company details..." />;
  }

  // Show blocking screen for access denied or company not found
  if (error && (error.code === 'ACCESS_DENIED' || error.code === 'NOT_FOUND')) {
    return <BlockingScreen companyId={companyId} />;
  }

  // Show error state for other errors (auth, network, server errors)
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-4">
            {error.code === 'UNAUTHORIZED' && (
              <div className="text-amber-600">
                <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
                <p>Please log in to access this company.</p>
              </div>
            )}
            {error.code === 'NETWORK_ERROR' && (
              <div className="text-blue-600">
                <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
                <p>Please check your internet connection and try again.</p>
              </div>
            )}
            {(error.code === 'UNKNOWN' || !error.code) && (
              <div className="text-red-600">
                <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
                <p>{error.message}</p>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
            
            {error.code === 'UNAUTHORIZED' && (
              <button
                onClick={() => window.location.href = '/auth/login'}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Go to Login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show blocking screen if no company data (shouldn't happen with proper error handling)
  if (!company) {
    return <BlockingScreen companyId={companyId} />;
  }

  // Render the actual company layout
  return (
    <div className="flex">
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}