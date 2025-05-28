import { auth as firebaseAuth } from '@/lib/firebase/firebaseClient';

export default async function createCompany(params: {
  name: string;
  billingEmail?: string;
}) {
  const currentUser = firebaseAuth.currentUser;
    console.log('Current user:', currentUser);
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }

  const idToken = await currentUser.getIdToken();
  console.log('Creating company with ID token:', idToken);
  const res = await fetch('/api/company', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to create company');
  }

  return (await res.json()) as { companyId: string };
}
