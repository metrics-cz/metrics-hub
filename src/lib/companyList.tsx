'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider';
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
      // 1. Type the response explicitly
     const { data, error } = await supabase
         .from('company_users')
        .select(`
          role, 
          company:companies (
            id, 
            name, 
            billing_email, 
            plan, 
            owner_uid, 
            created_at, 
            active, 
            logo_url, 
            rectangular_logo_url, 
            primary_color, 
            secondary_color, 
            contact_details, 
            updated_at
          )
        `)
        .eq('user_id', user.id) as { data: CompanyUserResponse[] | null; error: any };

      if (error) {
        console.error('Failed to fetch companies:', error.message);
        setLoading(false);
        return;
      }

      // 2. Safely access nested properties with type assertion
      const formatted = (data ?? [])
        .filter(item => item.company) // Ensure company exists
        .map(item => ({
          ...item.company,
          userRole: item.role,
        }));

      setCompanies(formatted);
      setLoading(false);
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