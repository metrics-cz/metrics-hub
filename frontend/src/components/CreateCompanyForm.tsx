'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

import { callCreateCompany } from '@/lib/firebase/callables';
import { db } from '@/lib/firebase/firebaseClient';

export default function CreateCompanyForm() {
  const router = useRouter();

  /* ------------------- local form state ------------------- */
  const [name, setName] = useState('');
  const [billingEmail, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /* ------------------------- submit ----------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Cloud Function creates the doc & returns its ID
      const { companyId } = await callCreateCompany({ name, billingEmail });

      // optional: warm the cache / make sure it exists
      await getDoc(doc(db, 'companies', companyId));

      // selecting a company is now just a navigation
      router.replace(`/companies/${companyId}`);
    } catch (err: any) {
      setMessage(err.message ?? 'Chyba');
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------- UI ------------------------- */
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 w-full max-w-sm text-neutral-900"
    >
      {/* Název firmy */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Název&nbsp;firmy*
        </label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-3 py-2 rounded text-neutral-900 placeholder-neutral-400 focus:ring-primary/50"
        />
      </div>

      {/* Fakturační e-mail */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Fakturační&nbsp;e-mail
        </label>
        <input
          type="email"
          value={billingEmail}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded text-neutral-900 placeholder-neutral-400 focus:ring-primary/50"
        />
      </div>

      {/* Submit */}
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
