'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { type Company, type UserCompany } from '@/lib/validation/companySchema';

// Define type for the nested company response
type CompanyUserResponse = {
  role: string;
  company: Company;
};

type CompanyListContextType = {
  companies: UserCompany[];
  loading: boolean;
};

const Ctx = createContext<CompanyListContextType | null>(null);

export function CompanyListProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<UserCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCompanies([]);
      setLoading(false);
      return;
    }

    const fetchCompanies = async () => {
      setLoading(true);
      
      try {
        const response = await fetch('/api/companies');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch companies');
        }

        const { data } = await response.json();
        setCompanies(data || []);
      } catch (error) {
        console.error('Failed to fetch companies:', error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [user]);

  return <Ctx.Provider value={{ companies, loading }}>{children}</Ctx.Provider>;
}

export function useCompanyList() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCompanyList must be used within CompanyListProvider');
  return ctx.companies;
}

export function useCompanyListLoading() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCompanyListLoading must be used within CompanyListProvider');
  return ctx.loading;
}