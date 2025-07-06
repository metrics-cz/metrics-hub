'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { cachedApi } from '@/lib/cachedApi';

interface CurrentCompanyContextType {
  company: any | null;
  userRole: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const CurrentCompanyContext = createContext<CurrentCompanyContextType | undefined>(undefined);

export function useCurrentCompany() {
  const context = useContext(CurrentCompanyContext);
  if (context === undefined) {
    throw new Error('useCurrentCompany must be used within a CurrentCompanyProvider');
  }
  return context;
}

export function CurrentCompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get companyId from URL params directly to avoid circular dependency
  const params = useParams<{ companyId?: string }>();
  const companyId = params?.companyId;

  // Track if we're waiting for company data to load
  const isWaitingForCompany = useMemo(() => {
    return !company && user && companyId; // We have a user and companyId but no company yet
  }, [company, user, companyId]);


  // Fetch user role for the current company
  const fetchUserRole = useCallback(async (retryCount: number = 0) => {
    if (!companyId || !user) {
      setUserRole(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await cachedApi.fetchCompany(companyId);
      setCompany(data.company || data); // Set company data
      setUserRole(data.userRole || null);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error fetching user role:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user role';
      
      // Handle auth errors specifically to prevent crashes
      if (err instanceof Error && (err.message.includes('AuthApiError') || err.message.includes('JWT'))) {
        console.warn('Authentication error while fetching company data, skipping update');
        setCompany(null);
        setUserRole(null);
        setError('Authentication required');
        setIsLoading(false);
        return;
      }
      
      // Handle specific error cases
      if (err instanceof Error && err.message.includes('403')) {
        setError('No access to this company');
        setUserRole(null);
        setIsLoading(false);
        return;
      }
      
      if (err instanceof Error && err.message.includes('404')) {
        setError('Company not found');
        setUserRole(null);
        setIsLoading(false);
        return;
      }
      
      // Retry mechanism for network errors (but not auth errors)
      if (retryCount < 2 && (err instanceof Error && (err.message.includes('fetch') || err.message.includes('Network'))) && !err.message.includes('AuthApiError')) {
        console.log(`Retrying user role fetch (attempt ${retryCount + 1})`);
        setTimeout(() => fetchUserRole(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      setError(errorMessage);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, user]);

  // Fetch company data and user role when companyId or user changes
  useEffect(() => {
    if (companyId && user) {
      fetchUserRole();
    } else if (!isWaitingForCompany) {
      // Clear data if we're not waiting for company data
      setCompany(null);
      setUserRole(null);
      setIsLoading(false);
    }
  }, [companyId, user, isWaitingForCompany]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    company,
    userRole,
    isLoading: Boolean(isLoading || isWaitingForCompany),
    error,
    refetch: () => fetchUserRole(0), // Reset retry count when manually refetching
  }), [company, userRole, isLoading, isWaitingForCompany, error, fetchUserRole]);

  return (
    <CurrentCompanyContext.Provider value={contextValue}>
      {children}
    </CurrentCompanyContext.Provider>
  );
}