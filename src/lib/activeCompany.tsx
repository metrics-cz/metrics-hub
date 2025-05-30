import { useCompanyList } from '@/lib/companyList';
import { useParams } from 'next/navigation';

export function useActiveCompany() {
  const companies = useCompanyList();
  const { companyId } = useParams<{ companyId?: string }>();
  return companies.find((c) => c.id === companyId) ?? null;
}
