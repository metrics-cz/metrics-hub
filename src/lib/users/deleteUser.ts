// src/lib/users/deleteUser.ts
import { supabase } from '@/lib/supabaseClient';

export async function deleteUser(
  userId: string,
  companyId: string
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    throw new Error('Not authenticated – unable to obtain access token.');
  }

  const res = await fetch(`/api/companies/${companyId}/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    // try to read JSON error body, fall back to statusText
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body?.error ?? msg;
    } catch {
      /* ignore JSON parse error */
    }
    throw new Error(`Error deleting user: ${msg}`);
  }
}
