'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCompanyById } from '@/lib/company/getCompanyById';
import { useTranslations } from 'next-intl';

export default function BillingPage() {
    const { companyId } = useParams<{ companyId?: string }>();
    const [company, setCompany] = useState<any>(null);
    const t = useTranslations('billing');

    useEffect(() => {
        if (companyId && typeof companyId === 'string') {
            getCompanyById(companyId).then(setCompany).catch(console.error);
        }
    }, [companyId]);

    return (
        <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{t('title')}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Current Plan */}
                <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 col-span-1">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('currentPlan')}</div>
                    <span className="inline-block px-2 py-0.5 text-xs text-white bg-blue-600 rounded mb-2">
                        Pro
                    </span>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">1 251 Kč / měsíc</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('includingVat')}</div>
                    <div className="w-full h-1 bg-gray-100 dark:bg-gray-600 rounded mb-4">
                        <div className="h-1 w-5 bg-blue-600 rounded"></div>
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-sm">
                        {t('changePlan')}
                    </button>
                </section>

                {/* Payment Information */}
                <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 col-span-1">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('paymentInfo')}</h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder={t('companyName')}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <input
                            type="text"
                            placeholder={t('ico')}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <input
                            type="text"
                            placeholder={t('dic')}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <input
                            type="email"
                            placeholder={t('emailPlaceholder')}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <button className="bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-500 text-sm">
                            {t('save')}
                        </button>
                    </div>
                </section>

                {/* Payment Method */}
                <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 col-span-1">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('paymentMethod')}</h3>
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">VISA **** 1234</div>
                            <div className="text-gray-500 dark:text-gray-400">{t('expires')} 04/27</div>
                        </div>
                        <button className="text-blue-600 dark:text-blue-400 text-sm hover:underline">{t('edit')}</button>
                    </div>
                    <button className="bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-500 text-sm w-full">
                        {t('addNewCard')}
                    </button>
                </section>
            </div>

            {/* Invoice History */}
            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 overflow-auto">
                <h3 className="text-lg font-semibold mb-4 flex justify-between items-center text-gray-900 dark:text-gray-100">
                    {t('invoiceHistory')}
                    <button className="text-blue-600 dark:text-blue-400 text-sm hover:underline">{t('download')}</button>
                </h3>
                <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                    <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                        <tr>
                            <th className="px-4 py-2">{t('date')}</th>
                            <th className="px-4 py-2">{t('invoiceNumber')}</th>
                            <th className="px-4 py-2">{t('amount')}</th>
                            <th className="px-4 py-2">{t('status')}</th>
                            <th className="px-4 py-2">PDF</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <tr key={i} className="rounded bg-white dark:bg-gray-700 shadow-sm">
                                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">2025–06</td>
                                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">F-{1000 + i}</td>
                                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">7 500 Kč</td>
                                <td className="px-4 py-3 text-green-600 dark:text-green-400">{t('paid')}</td>
                                <td className="px-4 py-3 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">{t('download')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </main>
    );
}
