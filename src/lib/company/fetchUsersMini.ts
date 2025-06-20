import { supabase } from '@/lib/supabaseClient';
import type { CompanyUserMini } from '@/lib/validation/companyUserMiniSchema';

export async function fetchUsersByCompanyMini(companyId: string) {
   const {
      data: { session },
    } = await supabase.auth.getSession();
   const token = session?.access_token;
  if (!token) {
    throw new Error('Not authenticated – unable to obtain access token.');
  }
  const res = await fetch(`/api/company/${companyId}/users/mini`, {
    headers: { Authorization: `Bearer ${token}` },
  });
   if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as CompanyUserMini[];
}
