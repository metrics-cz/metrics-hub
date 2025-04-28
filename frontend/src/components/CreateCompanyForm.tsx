'use client';

import { useState } from 'react';
import { callCreateCompany } from '@/lib/callables';

export default function CreateCompanyForm() {
  const [name, setName]             = useState('');
  const [billingEmail, setEmail]    = useState('');
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMessage(null);

    try {
      const { companyId } = await callCreateCompany({ name, billingEmail });
      setMessage(`Společnost vytvořena (ID: ${companyId})`);
      setName(''); setEmail('');
    } catch (err: any) {
      setMessage(err.message ?? 'Chyba');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div>
        <label className="block text-sm mb-1">Název firmy*</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Fakturační e-mail</label>
        <input
          type="email"
          value={billingEmail}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <button
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Ukládám…' : 'Vytvořit společnost'}
      </button>

      {message && <p className="text-sm italic">{message}</p>}
    </form>
  );
}
