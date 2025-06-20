'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCompanyById } from '@/lib/company/getCompanyById';
import { type Company } from '@/lib/validation/companySchema';
export default function CompanySettingsPage() {
  /* params from URL */
  const { companyId } = useParams<{ companyId: string }>();

  /* local state */
  const [company, setCompany] = useState<Company | null>(null);

  /* fetch once `companyId` is available */
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const data = await getCompanyById(companyId);
        setCompany(data);
      } catch (error) {
        console.error("Error fetching company:", error);
      } 
    };

    fetchCompany();  // Call the async function
  }, []);

  /* -------------------------------------------------------------------- */
  return (
    <main className="max-w-full mx-auto px-6 py-8">
      <h1 className="text-3xl font-semibold mb-4">Nastavení firmy</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[4fr_4fr] gap-8">
        {/* --------- Profil firmy --------- */}
        <section className="border border-gray-200 rounded-lg p-6 relative">
          {company?.active ? (
            <span className="absolute top-4 right-4 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Aktivní
            </span>
          ) : (
            <span className="absolute top-4 right-4 bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Neaktivní
            </span>
          )}

          <div className="flex items-center mb-4">
            <div className="w-28 h-28 bg-gray-300 rounded-full mr-5" />
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold mb-1">{company?.name}</h2>
              <input
                type="text"
                placeholder="Firma 123"
                className="border border-gray-300 rounded px-3 py-2 w-64"
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
            className="border border-gray-300 rounded w-full px-3 py-2 resize-none"
          />
          <button className="mt-6 bg-blue-600 text-white rounded px-6 py-2 w-full hover:bg-blue-700 transition">
            Uložit profil
          </button>
        </section>

        {/* ------ Fakturační adresa ------ */}
        <section className="border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-6">Fakturační adresa</h3>
          <div className="grid grid-cols-2 gap-5 mb-6">
            <input type="text" placeholder="Ulice a číslo" className="border border-gray-300 rounded px-3 py-2" />
            <input type="text" placeholder="Město" className="border border-gray-300 rounded px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <input type="text" placeholder="PSČ" className="border border-gray-300 rounded px-3 py-2" />
            <select className="border border-gray-300 rounded px-3 py-2">
              <option>Česko</option>
            </select>
          </div>
        </section>

        {/* ---------- Branding ---------- */}
        <section className="border border-gray-200 rounded-lg p-6">
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
        <section className="border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-6">Kontaktní údaje</h3>
          <div className="grid grid-cols-3 gap-6">
            <input type="tel" placeholder="Telefon" className="border border-gray-300 rounded px-3 py-2" />
            <input type="email" placeholder="support@firma123.cz" className="border border-gray-300 rounded px-3 py-2" />
            <input type="url" placeholder="Web" className="border border-gray-300 rounded px-3 py-2" />
          </div>
        </section>
      </div>
    </main>
  );
}
