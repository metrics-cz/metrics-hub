'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface CreateCompanyFormProps {
 onClose: () => void;
}

export default function CreateCompanyForm({ onClose }: CreateCompanyFormProps) {
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

   onClose();
   router.replace(`/companies/${data.companyId}`);
  } catch (err: any) {
   setMessage(err.message ?? 'Chyba');
  } finally {
   setLoading(false);
  }
 };

 return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
   <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
    <div className="flex items-center justify-between p-6 border-b border-border-light">
     <h2 className="text-xl font-semibold text-primary">
      Vytvořit novou firmu
     </h2>
     <button
      type="button"
      onClick={(e) => {
       e.preventDefault();
       e.stopPropagation();
       onClose();
      }}
      className="text-muted hover:text-secondary hover:text-primary transition-colors p-1"
     >
      <X size={24} />
     </button>
    </div>

    <form onSubmit={handleSubmit} className="p-6 space-y-4">
     <div>
      <label className="block text-sm font-medium text-secondary mb-1">
       Název firmy *
      </label>
      <input
       required
       value={name}
       onChange={(e) => setName(e.target.value)}
       className="w-full form-input bg-input border-border-default text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-blue-500"
       placeholder="Moje společnost s.r.o."
      />
     </div>

     <div>
      <label className="block text-sm font-medium text-secondary mb-1">
       Fakturační e-mail
      </label>
      <input
       type="email"
       value={billingEmail}
       onChange={(e) => setEmail(e.target.value)}
       className="w-full form-input bg-input border-border-default text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-blue-500"
       placeholder="email@example.com"
      />
     </div>

     {message && (
      <p className="text-sm text-error">{message}</p>
     )}

     <div className="flex gap-3 pt-4">
      <button
       type="button"
       onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
       }}
       className="flex-1 border border-border-default py-2 rounded-md text-primary hover:bg-base transition-colors"
      >
       Zrušit
      </button>
      <button
       type="submit"
       disabled={loading}
       className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
       {loading ? 'Vytvářím...' : 'Vytvořit firmu'}
      </button>
     </div>
    </form>
   </div>
  </div>
 );
}
