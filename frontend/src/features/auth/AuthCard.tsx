// features/auth/AuthCard.tsx
'use client';
import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import clsx from 'classnames';

export default function AuthCard() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const router = useRouter();

  // už přihlášený => pryč
  onAuthStateChanged(auth, (u) => u && router.replace('/'));

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden ring-1 ring-black/5">
        {/* záhlaví + přepínač */}
        <nav className="flex">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'flex-1 py-3 text-sm font-medium tracking-wide uppercase transition',
                tab === t
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-neutral-500 hover:text-primary'
              )}
            >
              {t === 'login' ? 'Přihlášení' : 'Registrace'}
            </button>
          ))}
        </nav>

        <div className="p-6">
          {tab === 'login' ? <SignInForm /> : <SignUpForm switchToLogin={() => setTab('login')} />}
        </div>
      </div>
    </div>
  );
}
