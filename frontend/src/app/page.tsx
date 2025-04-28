'use client';

import dynamic from 'next/dynamic';
import CreateCompanyForm from '@/components/CreateCompanyForm';

/* --- pokud chcete zachovat login + form v jednom --- */
const FirebaseAuth = dynamic(
  () => import('@/components/FirebaseAuth').then((m) => m.default),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-10 p-6">
      <FirebaseAuth />
      <CreateCompanyForm />
    </main>
  );
}
