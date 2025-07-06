'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { type Company } from '@/lib/validation/companySchema';
import CompanyInitialsIcon from '@/components/company/CompanyInitialsIcon';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useActiveCompany } from '@/lib/activeCompany';
export default function CompanySettingsPage() {
  /* params from URL */
  const { companyId } = useParams<{ companyId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  
  /* Get company data from context instead of fetching */
  const company = useActiveCompany();
  
  /* local state */
  const [deleting, setDeleting] = useState(false);

  /* --- delete company function --- */
  const handleDeleteCompany = async () => {
    if (!company || !user) return;

    const confirmed = confirm(
      `Opravdu chcete smazat společnost "${company.name}"? Tato akce je nevratná a všechna data budou trvale odstraněna.`
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Nejste přihlášeni');
      }

      const response = await fetch(`/api/company/${companyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba při mazání společnosti');
      }

      // Redirect to companies list or dashboard
      router.push('/companies');
    } catch (error) {
      console.error('Error deleting company:', error);
      alert(error instanceof Error ? error.message : 'Chyba při mazání společnosti');
    } finally {
      setDeleting(false);
    }
  };

  /* -------------------------------------------------------------------- */
  return (
    <main className="max-w-full mx-auto px-6 py-8">
      <h1 className="text-3xl font-semibold mb-4">Nastavení firmy</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[4fr_4fr] gap-8">
        {/* --------- Profil firmy --------- */}
        <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 relative bg-white dark:bg-gray-800">
          <span className="absolute top-4 right-4 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Aktivní
          </span>

          <div className="flex items-center mb-4">
            <div className="m-2">
              {
                company?.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={`${company.name} logo`}
                    className="w-16 h-16 rounded-full mr-4"
                  />
                ) : (
                  <CompanyInitialsIcon name={company?.name} size={64} />
                )
              }
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold mb-1">{company?.name}</h2>
              <input
                type="text"
                placeholder="Firma 123"
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 w-64 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                defaultValue={company?.name}
              />
            </div>
          </div>

          <label htmlFor="desc" className="block text-sm font-medium mb-1">
            Popis společnosti
          </label>
          <textarea
            id="desc"
            rows={4}
            className="border border-gray-300 dark:border-gray-600 rounded w-full px-3 py-2 resize-none bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <button className="mt-6 bg-blue-600 text-white rounded px-6 py-2 w-full hover:bg-blue-700 transition">
            Uložit profil
          </button>
        </section>

        {/* ------ Fakturační adresa ------ */}
        <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-lg mb-6">Fakturační adresa</h3>
          <div className="grid grid-cols-2 gap-5 mb-6">
            <input type="text" placeholder="Ulice a číslo" className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <input type="text" placeholder="Město" className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <input type="text" placeholder="PSČ" className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <select className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <option>Česko</option>
            </select>
          </div>
        </section>

        {/* ---------- Branding ---------- */}
        <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-lg mb-6">Branding</h3>
          <div className="flex items-center gap-8 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-[#1976d2] border border-gray-300" />
              <span>1976d2</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-[#008080] border border-gray-300" />
              <span>008080</span>
            </div>
          </div>
          <div className="border border-gray-300 rounded p-5 text-center cursor-pointer">
            <p className="font-semibold mb-1">Nahrát logo</p>
            <p className="text-sm text-gray-500">Doporučeno 256 x 255 px PNG</p>
          </div>
        </section>

        {/* ------- Kontaktní údaje ------- */}
        <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-lg mb-6">Kontaktní údaje</h3>
          <div className="grid grid-cols-3 gap-6">
            <input type="tel" placeholder="Telefon" className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <input type="email" placeholder="support@firma123.cz" className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <input type="url" placeholder="Web" className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>
        </section>

        {/* ------- Danger Zone ------- */}
        <section className="border border-red-200 dark:border-red-800 rounded-lg p-6 bg-red-50 dark:bg-red-900/20 col-span-full">
          <h3 className="font-semibold text-lg mb-4 text-red-600 dark:text-red-400">Nebezpečná zóna</h3>
          <p className="text-sm text-red-700 dark:text-red-300 mb-6">
            Smazání společnosti je nevratná akce. Všechna data společnosti, včetně uživatelů a pozvánek, budou trvale odstraněna.
          </p>
          <button
            onClick={handleDeleteCompany}
            disabled={deleting}
            className="bg-red-600 text-white px-6 py-2 rounded-md shadow-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Mazání...' : 'Smazat společnost'}
          </button>
        </section>
      </div>
    </main>
  );
}
