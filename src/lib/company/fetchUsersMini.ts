import { cachedApi } from '@/lib/cachedApi';
import type { CompanyUserMini } from '@/lib/validation/companyUserMiniSchema';

export async function fetchUsersByCompanyMini(companyId: string) {
  const data = await cachedApi.fetchCompanyUsers(companyId);
  return data as CompanyUserMini[];
}
