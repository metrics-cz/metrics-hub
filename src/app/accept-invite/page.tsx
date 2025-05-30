'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/firebaseClient';
import { getIdToken } from 'firebase/auth';

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'verifying' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (!token) return;

    const acceptInvite = async () => {
      setStatus('verifying');

      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push('/auth?redirect=accept-invite&token=' + token);
        return;
      }

      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ token }),
      });

      setStatus(res.ok ? 'done' : 'error');
    };

    acceptInvite();
  }, [token, router]);

  return (
    <div className="p-4">
      {status === 'verifying' && <p>Verifying invitation…</p>}
      {status === 'done' && <p>Invitation accepted! Redirecting…</p>}
      {status === 'error' && <p>Invitation expired or invalid.</p>}
    </div>
  );
}
