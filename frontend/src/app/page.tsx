'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import CreateCompanyForm from '@/components/CreateCompanyForm';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  /* hlídáme auth stav */
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) router.replace('/auth');   // není přihlášen → /auth
      else    setUser(u);
    });
  }, [router]);

  if (!user) return null;                // krátká prázdná fáze

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-bg-light animate-fade">
      <CreateCompanyForm />
    </main>
  );
}
