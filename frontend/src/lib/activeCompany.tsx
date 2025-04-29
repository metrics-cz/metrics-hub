'use client';

import {
  createContext, useCallback, useContext, useEffect, useState,
} from 'react';
import {
  collection, doc, getDocs, onSnapshot, getDoc, QueryDocumentSnapshot,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';

type Company = { id: string; name: string; logoURL?: string };

interface Ctx {
  companies: Company[];
  active: Company | null;
  setActive: (c: Company) => void;
}
const ActiveCompanyContext = createContext<Ctx | undefined>(undefined);

/* --------------------------- PROVIDER ---------------------------- */
export function ActiveCompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [active, setActive]       = useState<Company | null>(null);

  /* --- 1) posloucháme změny v /​users/{uid}.companies ------------- */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { setCompanies([]); setActive(null); return; }

      const userDoc = doc(db, 'users', user.uid);

      const unsubUser = onSnapshot(userDoc, async (snap) => {
        const ids: string[] = snap.data()?.companies ?? [];
      
        if (!ids.length) { setCompanies([]); setActive(null); return; }
      
        // načti metadata – ignoruj příp. permission-denied
        const docs = await Promise.all(ids.map(async (id) => {
          try     { return await getDoc(doc(db, 'companies', id)); }
          catch { return null; }         // uživatel zatím nemá role → skip
        }));
      
        const list: Company[] = docs
          .filter((s): s is QueryDocumentSnapshot => !!s && s.exists())
          .map((s) => ({ id: s.id, ...(s.data() as any) }));
      
        setCompanies(list);
      
        const last = localStorage.getItem('mh:lastCompany');
        setActive(list.find((c) => c.id === last) ?? null);
      });

      // úklid
      return () => unsubUser();
    });

    return () => unsubAuth();
  }, []);

  /* --- 2) změna aktivní firmy ------------------------------------ */
  const handleSetActive = useCallback((c: Company) => {
    setActive(c);
    localStorage.setItem('mh:lastCompany', c.id);
  }, []);

  return (
    <ActiveCompanyContext.Provider value={{ companies, active, setActive: handleSetActive }}>
      {children}
    </ActiveCompanyContext.Provider>
  );
}

/* --------------------------- HOOK ---------------------------- */
export function useActiveCompany() {
  const ctx = useContext(ActiveCompanyContext);
  if (!ctx) throw new Error('ActiveCompanyProvider missing');
  return ctx;
}
