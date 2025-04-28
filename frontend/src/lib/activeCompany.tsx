import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebaseClient';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  getDocs,
  type DocumentData,
} from 'firebase/firestore';

/* ---------- typy ---------- */
export interface Company extends DocumentData {
  id: string;
  name: string;
}

type Ctx = {
  companies: Company[];
  active  : Company | null;
  setActive: (c: Company) => void;
};
const ActiveCompanyContext = createContext<Ctx | undefined>(undefined);

/* ---------- provider ---------- */
export function ActiveCompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [active, setActive]       = useState<Company | null>(null);

  /*--- load companies for current user ---*/
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { setCompanies([]); setActive(null); return; }

      // firemní role, kde mám dokument /companies/{cid}/roles/{uid}
      const q = query(collection(db, 'companies'), where(`roles.${user.uid}`, 'in', ['owner','admin','reader']));
      const snap = await getDocs(q);

      const list: Company[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setCompanies(list);

      // z localStorage, jinak první
      const stored = localStorage.getItem('activeCompanyId');
      const found  = list.find((c) => c.id === stored) ?? list[0] ?? null;
      setActive(found);
    });

    return unsub;
  }, []);

  /*--- persist selection ---*/
  const setActivePersist = (c: Company) => {
    localStorage.setItem('activeCompanyId', c.id);
    setActive(c);
  };

  return (
    <ActiveCompanyContext.Provider value={{ companies, active, setActive: setActivePersist }}>
      {children}
    </ActiveCompanyContext.Provider>
  );
}

/* ---------- hook ---------- */
export function useActiveCompany() {
  const ctx = useContext(ActiveCompanyContext);
  if (!ctx) throw new Error('useActiveCompany must be used inside <ActiveCompanyProvider>');
  return ctx;
}
