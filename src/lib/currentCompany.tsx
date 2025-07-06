'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useActiveCompany } from '@/lib/activeCompany';
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
  const company = useActiveCompany();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize company ID to prevent unnecessary re-renders
  const companyId = useMemo(() => company?.id, [company?.id]);

  // Track if we're waiting for company data to load
  const isWaitingForCompany = useMemo(() => {
    return !company && user; // We have a user but no company yet
  }, [company, user]);


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
      setUserRole(data.userRole || null);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error fetching user role:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user role';
      
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
      
      // Retry mechanism for network errors
      if (retryCount < 2 && (err instanceof Error && (err.message.includes('fetch') || err.message.includes('Network')))) {
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

  // Fetch user role when company or user changes
  useEffect(() => {
    if (companyId && user) {
      fetchUserRole();
    } else if (!isWaitingForCompany) {
      // Only clear the role if we're not waiting for company data
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