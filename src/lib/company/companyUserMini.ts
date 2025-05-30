// src/lib/company/companyUserMini.ts
import { z } from 'zod';
import { supabase } from '@/lib/supabaseClient';

/* ---------- Zod schemas ---------- */

/* ---------- Zod schema ---------- */
const rowSchema = z.object({
  company_id      : z.string().uuid(),
  role            : z.string(),
  id              : z.string().uuid(),
  email           : z.string().email(),
  last_sign_in_at : z.coerce.date().nullable(),
  full_name       : z.string().nullable(),
  avatar_url      : z.string().url().nullable()           
});

/* ---------- Type used by your React UI ---------- */
export type CompanyUserMini = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;      
  lastSignIn: Date | null;
  role: string;
};


/* ---------- fetch helper ---------- */
export async function fetchUsersByCompanyMini(
  companyId: string
): Promise<CompanyUserMini[]> {

  const { data, error } = await supabase
    .from('company_user_mini')
    .select('*')
    .eq('company_id', companyId);

  if (error) {
    console.error('fetchUsersByCompanyMini:', error.message);
    return [];
  }

  return data.flatMap(row => {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      console.warn('Invalid row skipped', parsed.error.flatten());
      return [];
    }

    const {
      id,
      email,
      full_name,
      avatar_url,
      last_sign_in_at,
      role,
    } = parsed.data;

    return [{
      id,
      email,
      fullName  : full_name ?? '',
      avatarUrl : avatar_url ?? null,
      lastSignIn: last_sign_in_at,
      role,
    }];
  });
}

