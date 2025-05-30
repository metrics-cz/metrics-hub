'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider';

export type Company = {
  id: string;
  name: string;
  logo_url?: string;
};

type CompanyUserWithCompany = {
  company: {
    id: string;
    name: string;
    logo_url?: string;
  };
};

const Ctx = createContext<Company[] | null>(null);

export function CompanyListProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    if (!user) return setCompanies([]);

    const fetchCompanies = async () => {
      const { data, error } = await supabase
        .from<CompanyUserWithCompany>('company_users')
        .select('company:companies (id, name, logo_url)')
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to fetch companies:', error.message);
        return;
      }

      const formatted = (data ?? [])
        .filter((item) => item.company)
        .map((item) => ({
          id: item.company.id,
          name: item.company.name,
          logo_url: item.company.logo_url,
        }));

      setCompanies(formatted);
    };

    fetchCompanies();
  }, [user]);

  return <Ctx.Provider value={companies}>{children}</Ctx.Provider>;
}

export function useCompanyList() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('CompanyListProvider missing');
  return ctx;
}
