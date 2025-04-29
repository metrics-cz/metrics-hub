'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

import { callCreateCompany } from '@/lib/callables';
import { useActiveCompany } from '@/lib/activeCompany';
import { db } from '@/lib/firebaseClient';

export default function CreateCompanyForm() {
  /* ------------------------------------------------------------------ */
  const router = useRouter();
  const { companies, setActive } = useActiveCompany();

  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  /* jakmile provider načte detail právě založené firmy → nastavíme ji */
  useEffect(() => {
    if (!lastCreatedId) return;
    const fresh = companies.find((c) => c.id === lastCreatedId);
    if (fresh) setActive(fresh);
  }, [companies, lastCreatedId, setActive]);

  /* ------------------------- lokální stav formuláře ------------------ */
  const [name, setName] = useState('');
  const [billingEmail, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /* ------------------------------- submit ---------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { companyId } = await callCreateCompany({ name, billingEmail });

      // načteme detail a rovnou nastavíme jako aktivní
      const snap = await getDoc(doc(db, 'companies', companyId));
      if (snap.exists()) setActive({ id: companyId, ...(snap.data() as any) });

      setLastCreatedId(companyId);

      // přesměrujeme do dashboardu
      router.replace('/app');
    } catch (err: any) {
      setMessage(err.message ?? 'Chyba');
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------ UI -------------------------------- */
  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm text-neutral-900">
      {/* Název firmy --------------------------------------------------- */}
      <div>
        <label className="block text-sm font-medium mb-1">Název&nbsp;firmy*</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-3 py-2 rounded text-neutral-900 placeholder-neutral-400 focus:ring-primary/50"
        />
      </div>

      {/* Fakturační e‑mail -------------------------------------------- */}
      <div>
        <label className="block text-sm font-medium mb-1">Fakturační&nbsp;e‑mail</label>
        <input
          type="email"
          value={billingEmail}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded text-neutral-900 placeholder-neutral-400 focus:ring-primary/50"
        />
      </div>

      {/* Submit --------------------------------------------------------- */}
      <button
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Ukládám…' : 'Vytvořit společnost'}
      </button>

      {message && <p className="text-sm italic text-red-600">{message}</p>}
    </form>
  );
}
