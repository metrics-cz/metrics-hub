// lib/companyList.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebaseClient';

export type Company = { id: string; name: string; logoURL?: string };
const Ctx = createContext<Company[] | null>(null);

export function CompanyListProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    const off = auth.onAuthStateChanged((user) => {
      if (!user) return setCompanies([]);
      const unsub = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
        const ids: string[] = snap.data()?.companies ?? [];
        const docs = await Promise.all(ids.map((id) => getDoc(doc(db, 'companies', id))));
        setCompanies(docs.flatMap((d) => (d.exists() ? [{ id: d.id, ...(d.data() as any) }] : [])));
      });
      return () => unsub();
    });
    return () => off();
  }, []);

  return <Ctx.Provider value={companies}>{children}</Ctx.Provider>;
}

export function useCompanyList() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('CompanyListProvider missing');
  return ctx;
}
