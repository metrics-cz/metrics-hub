'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const schema = z.object({
 name: z.string().min(2, 'Název firmy musí mít alespoň 2 znaky'),
 description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateCompanyModalProps {
 onClose: () => void;
}

export default function CreateCompanyModal({ onClose }: CreateCompanyModalProps) {
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const router = useRouter();

 const {
  register,
  handleSubmit,
  formState: { errors },
 } = useForm<FormData>({
  resolver: zodResolver(schema),
 });

 const onSubmit = async (data: FormData) => {
  setLoading(true);
  setError(null);

  try {
   const { data: { session } } = await supabase.auth.getSession();

   if (!session?.access_token) {
    setError('Nejste přihlášeni');
    return;
   }

   const response = await fetch('/api/companies', {
    method: 'POST',
    headers: {
     'Content-Type': 'application/json',
     'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
     name: data.name,
     description: data.description,
    }),
   });

   if (response.ok) {
    const newCompany = await response.json();
    // Redirect to the new company
    router.push(`/companies/${newCompany.id}`);
    onClose();
   } else {
    const errorData = await response.json();
    setError(errorData.error || 'Chyba při vytváření firmy');
   }
  } catch (error) {
   console.error('Error creating company:', error);
   setError('Nepodařilo se vytvořit firmu. Zkuste to prosím znovu.');
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
      onClick={onClose}
      className="text-muted hover:text-secondary hover:text-primary transition-colors"
     >
      <X size={24} />
     </button>
    </div>

    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
     <div>
      <label className="block text-sm font-medium text-secondary mb-1">
       Název firmy *
      </label>
      <input
       type="text"
       {...register('name')}
       className="w-full form-input bg-input border-border-default text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-blue-500"
       placeholder="Moje společnost s.r.o."
      />
      {errors.name && (
       <p className="text-xs text-error mt-1">{errors.name.message}</p>
      )}
     </div>

     <div>
      <label className="block text-sm font-medium text-secondary mb-1">
       Popis společnosti (volitelné)
      </label>
      <textarea
       {...register('description')}
       rows={3}
       className="w-full form-input bg-input border-border-default text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-blue-500 resize-none"
       placeholder="Krátký popis vaší společnosti..."
      />
     </div>

     {error && (
      <p className="text-sm text-error">{error}</p>
     )}

     <div className="flex gap-3 pt-4">
      <button
       type="button"
       onClick={onClose}
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