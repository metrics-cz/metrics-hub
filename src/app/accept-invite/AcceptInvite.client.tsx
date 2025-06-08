'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/* UI states shown to the visitor */
type InviteStatus = 'idle' | 'verifying' | 'done' | 'error';

export default function AcceptInviteClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');     // invite token from e-mail
    const [status, setStatus] = useState<InviteStatus>('idle');

    /* run once the token is available */
    useEffect(() => {
        if (!token) return;                               // no token in URL → do nothing

        (async () => {
            /* 1 – make sure the visitor is signed in */
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // send them to /auth and bounce back here afterwards
                router.replace(`/auth?redirect=accept-invite&token=${token}`);
                return;
            }

            /* 2 – hit our API to accept the invite */
            setStatus('verifying');

            const res = await fetch('/api/accept-invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ token }),
            });

            /* 3 – handle result */
            if (res.ok) {
                setStatus('done');
                setTimeout(() => router.replace('/companies'), 1500);
            } else {
                setStatus('error');
            }
        })();
    }, [token, router]);

    /* 4 – simple feedback UI */
    return (
        <main className="p-4 text-center">
            {status === 'idle' && <p>Čekám na pozvánku…</p>}
            {status === 'verifying' && <p>Ověřuji pozvánku…</p>}
            {status === 'done' && <p>Pozvánka přijata! Přesměrovávám…</p>}
            {status === 'error' && <p>Pozvánka vypršela nebo je neplatná.</p>}
        </main>
    );
}
