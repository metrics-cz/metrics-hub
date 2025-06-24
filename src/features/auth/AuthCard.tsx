'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import clsx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';

export default function AuthCard() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) router.replace('/');
    };
    checkSession();
  }, [router]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-gray-700">
        <nav className="flex">
          {(['login', 'register'] as const).map((t, index) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'flex-1 py-3 text-sm font-medium tracking-wide uppercase transition',
                index === 0 ? 'rounded-tl-2xl' : 'rounded-tr-2xl',
                tab === t
                  ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
              )}
            >
              {t === 'login' ? 'Přihlášení' : 'Registrace'}
            </button>
          ))}
        </nav>

        <div className={`relative h-full ${tab === 'register' ? 'min-h-[580px]' : 'min-h-[420px]'}`}>
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
