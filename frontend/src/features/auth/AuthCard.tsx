'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import clsx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';

export default function AuthCard() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const router = useRouter();

  // pokud už je někdo přihlášený, přesměruj
  onAuthStateChanged(auth, (u) => u && router.replace('/'));

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden ring-1 ring-black/5">
        {/* přepínač */}
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

        {/* obsah s animací fade/slide */}
        <div className="relative h-full min-h-[420px]">
          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="p-6 absolute inset-0"
              >
                <SignInForm />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.25 }}
                className="p-6 absolute inset-0"
              >
                <SignUpForm switchToLogin={() => setTab('login')} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
