'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCompanyById } from '@/lib/firebase/firebaseData';

export default function InvoicesPage() {
    const { companyId } = useParams<{ companyId?: string }>();
    const [company, setCompany] = useState<any>(null);

    useEffect(() => {
        if (companyId && typeof companyId === 'string') {
            getCompanyById(companyId).then(setCompany).catch(console.error);
        }
    }, [companyId]);

    return (
        <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
            <h1 className="text-3xl font-semibold">Fakturace</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Aktuální tarif */}
                <section className="bg-white border border-gray-200 rounded-lg p-6 col-span-1">
                    <div className="text-sm text-gray-500 mb-1">Aktuální tarif</div>
                    <span className="inline-block px-2 py-0.5 text-xs text-white bg-blue-600 rounded mb-2">
                        Pro
                    </span>
                    <div className="text-2xl font-bold">1 251 Kč / měsíc</div>
                    <div className="text-sm text-gray-500 mb-3">(Včetně DPH)</div>
                    <div className="w-full h-1 bg-gray-100 rounded mb-4">
                        <div className="h-1 w-5 bg-blue-600 rounded"></div>
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">
                        Změnit tarif
                    </button>
                </section>

                {/* Platební údaje */}
                <section className="bg-white border border-gray-200 rounded-lg p-6 col-span-1">
                    <h3 className="text-lg font-semibold mb-4">Platební údaje</h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Fakturační jméno firmy"
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        />
                        <input
                            type="text"
                            placeholder="IČO"
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        />
                        <input
                            type="text"
                            placeholder="DIČ (VAT)"
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        />
                        <input
                            type="email"
                            placeholder="info@firma123.cz"
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        />
                        <button className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200 text-sm">
                            Uložit
                        </button>
                    </div>
                </section>

                {/* Způsob platby */}
                <section className="bg-white border border-gray-200 rounded-lg p-6 col-span-1">
                    <h3 className="text-lg font-semibold mb-4">Způsob platby</h3>
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <div>
                            <div className="font-medium">VISA **** 1234</div>
                            <div className="text-gray-500">exp. 04/27</div>
                        </div>
                        <button className="text-blue-600 text-sm hover:underline">Upravit</button>
                    </div>
                    <button className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200 text-sm w-full">
                        Přidat novou kartu
                    </button>
                </section>
            </div>

            {/* Historie faktur */}
            <section className="bg-white border border-gray-200 rounded-lg p-6 overflow-auto">
                <h3 className="text-lg font-semibold mb-4 flex justify-between items-center">
                    Historie faktur
                    <button className="text-blue-600 text-sm hover:underline">Stáhnout</button>
                </h3>
                <table className="w-full text-sm text-left">
                    <thead className="text-gray-500 border-b">
                        <tr>
                            <th className="py-2">Datum</th>
                            <th className="py-2">Číslo faktury</th>
                            <th className="py-2">Částka</th>
                            <th className="py-2">Stav</th>
                            <th className="py-2">PDF</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <tr key={i} className="border-b">
                                <td className="py-2">2025–06</td>
                                <td className="py-2">F-{1000 + i}</td>
                                <td className="py-2">7 500 Kč</td>
                                <td className="py-2 text-green-600">Zaplaceno</td>
                                <td className="py-2 text-blue-600 hover:underline cursor-pointer">Stáhnout</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </main>
    );
}
