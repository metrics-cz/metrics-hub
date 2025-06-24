'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function CreateCompanyForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [billingEmail, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Get access token on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setMessage('Nejste přihlášen/a');
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, billingEmail }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Chyba při vytváření firmy');

      router.replace(`/companies/${data.companyId}`);
    } catch (err: any) {
      setMessage(err.message ?? 'Chyba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 w-full max-w-sm text-gray-900 dark:text-gray-100"
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
          className="w-full border px-3 py-2 rounded text-gray-900 dark:text-gray-100 dark:bg-gray-800 placeholder-gray-400 focus:ring-primary-500/50 dark:border-gray-600"
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
          className="w-full border px-3 py-2 rounded text-gray-900 dark:text-gray-100 dark:bg-gray-800 placeholder-gray-400 focus:ring-primary-500/50 dark:border-gray-600"
        />
      </div>

      {/* Submit */}
      <button
        disabled={loading}
        className="bg-primary-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-primary-700 transition-colors"
      >
        {loading ? 'Ukládám…' : 'Vytvořit společnost'}
      </button>

      {message && <p className="text-sm italic text-red-600">{message}</p>}
    </form>
  );
}
