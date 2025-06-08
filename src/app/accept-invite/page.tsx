'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/** UI status */
type InviteStatus = 'idle' | 'verifying' | 'done' | 'error';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');      // invite token from e-mail
  const [status, setStatus] = useState<InviteStatus>('idle');

  useEffect(() => {
    if (!token) return;                                // no token in URL → stay idle

    const run = async () => {
      /* ───── 1. Ensure the visitor is signed-in ───── */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // redirect to /auth and come back here afterwards
        router.replace(`/auth?redirect=accept-invite&token=${token}`);
        return;
      }

      /* ───── 2. Call our API to accept the invite ─── */
      setStatus('verifying');

      const res = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
      });

      /* ───── 3. Handle result ─────────────────────── */
      if (res.ok) {
        setStatus('done');
        // send the user to dashboard after 1.5 s
        setTimeout(() => router.replace('/companies'), 1500);
      } else {
        setStatus('error');
      }
    };

    run();
  }, [token, router]);

  /* ───── 4. Very simple feedback UI ──────────────── */
  return (
    <main className="p-4 text-center">
      {status === 'idle' && <p>Čekám na pozvánku…</p>}
      {status === 'verifying' && <p>Ověřuji pozvánku…</p>}
      {status === 'done' && <p>Pozvánka přijata! Přesměrovávám…</p>}
      {status === 'error' && <p>Pozvánka vypršela nebo je neplatná.</p>}
    </main>
  );
}
