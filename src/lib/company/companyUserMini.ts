// src/lib/company/companyUserMini.ts
import { z } from 'zod';
import { supabase } from '@/lib/supabaseClient';
import { type CompanyUserMini, companyUserMiniSchema} from '../validation/companyUserMiniSchema';

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
    const parsed = companyUserMiniSchema.safeParse(row);
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

