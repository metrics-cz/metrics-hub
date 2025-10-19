import { useCompanyList } from '@/lib/companyList';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { getLastSelectedCompany } from '@/lib/userPreferences';
import { type UserCompany } from '@/lib/validation/companySchema';

export function useActiveCompany(): UserCompany | null {
  const companies = useCompanyList();
  const { companyId } = useParams<{ companyId?: string }>();
  const { user } = useAuth();

  // Priority: URL companyId → Last selected company → First available company → null
  if (companyId) {
    // If we have a companyId in URL, use it
    return companies.find((c) => c.id === companyId) ?? null;
  }

  // If no companyId in URL, try to use last selected company
  if (user) {
    const lastSelectedCompanyId = getLastSelectedCompany(user);
    if (lastSelectedCompanyId) {
      const lastSelectedCompany = companies.find((c) => c.id === lastSelectedCompanyId);
      if (lastSelectedCompany) {
        return lastSelectedCompany;
      }
    }
  }

  // Fallback to first available company
  return companies.length > 0 ? companies[0] || null : null;
}
