'use client';

import { useState } from 'react';
import clsx from 'classnames';
import { useLocale } from 'next-intl';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Example flags import — you can replace with your icons or images
import CzFlag from '@/components/flags/CzFlag';
import EnFlag from '@/components/flags/EnFlag';
import { useRouter } from 'next/navigation';

type LocaleData = {
    code: string;
    name: string;
    Flag: React.FC<React.SVGProps<SVGSVGElement>>;
};

const LOCALES: LocaleData[] = [
    { code: 'cz', name: 'Čeština', Flag: CzFlag },
    { code: 'en', name: 'English', Flag: EnFlag },
];

export default function LanguageSwitcher({
    collapsed,
    isMobileHeader,
}: {
    collapsed: boolean;
    isMobileHeader?: boolean;
}) {
    const locale = useLocale();
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const currentLocale = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

    function changeLocale(newLocale: string) {
        const pathSegments = window.location.pathname.split('/');
        if (LOCALES.some(l => l.code === pathSegments[1])) {
            pathSegments[1] = newLocale;
        } else {
            pathSegments.splice(1, 0, newLocale); // insert locale if missing
        }
        setOpen(false);
        router.push(pathSegments.join('/') || '/');
    }

    // Render button differently based on collapsed or mobile header

    // Desktop collapsed: circle flag button
    if (!isMobileHeader && collapsed) {
        return (
            <div className="relative">
                <button
                    onClick={() => setOpen(!open)}
                    aria-label="Change language"
                    className="w-10 h-10 rounded-full overflow-hidden object-fill border border-white/20 hover:border-white transition"
                    title={currentLocale.name}
                >
                    <currentLocale.Flag className="w-full h-full" />
                </button>

                {open && (
                    <div className="absolute left-0 top-full mt-1 bg-primary-500 dark:bg-gray-800 rounded shadow-lg w-32 z-50">
                        {LOCALES.map(({ code, name, Flag }) => (
                            <button
                                key={code}
                                onClick={() => changeLocale(code)}
                                className={clsx(
                                    'flex items-center gap-2 px-3 py-2 w-full text-left text-white hover:bg-primary-600 dark:hover:bg-gray-700',
                                    code === locale ? 'bg-primary-600 dark:bg-gray-700 font-semibold' : ''
                                )}
                            >
                                <Flag className="w-5 h-5" />
                                <span className="text-sm">{name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Desktop expanded: rectangular flag + language
    if (!isMobileHeader && !collapsed) {
        return (
            <div className="relative">
                <button
                    onClick={() => setOpen(!open)}
                    aria-label="Change language"
                    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-700 transition"
                >
                    <currentLocale.Flag className="w-6 h-6" />
                    <span>{currentLocale.name}</span>
                    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {open && (
                    <div className="absolute left-0 top-full mt-1 bg-primary-500 dark:bg-gray-800 rounded shadow-lg w-40 z-50">
                        {LOCALES.map(({ code, name, Flag }) => (
                            <button
                                key={code}
                                onClick={() => changeLocale(code)}
                                className={clsx(
                                    'flex items-center gap-2 px-3 py-2 w-full text-left text-white hover:bg-primary-600 dark:hover:bg-gray-700',
                                    code === locale ? 'bg-primary-600 dark:bg-gray-700 font-semibold' : ''
                                )}
                            >
                                <Flag className="w-5 h-5" />
                                <span className="text-sm">{name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Mobile header: circle flag + arrow toggle
    if (isMobileHeader) {
        return (
            <div className="relative">
                <button
                    onClick={() => setOpen(!open)}
                    aria-label="Change language"
                    className="flex items-center gap-1 px-2 py-1 border-none rounded-full hover:bg-gray-700 transition"
                >
                    <currentLocale.Flag className="w-6 h-6 rounded-full" />
                    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {open && (
                    <div className="absolute right-0 top-full mt-1 bg-primary-500 dark:bg-gray-800 rounded shadow-lg w-40 z-50">
                        {LOCALES.map(({ code, name, Flag }) => (
                            <button
                                key={code}
                                onClick={() => changeLocale(code)}
                                className={clsx(
                                    'flex items-center gap-2 px-3 py-2 w-full text-left text-white hover:bg-primary-600 dark:hover:bg-gray-700',
                                    code === locale ? 'bg-primary-600 dark:bg-gray-700 font-semibold' : ''
                                )}
                            >
                                <Flag className="w-5 h-5" />
                                <span className="text-sm">{name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Fallback (should not happen)
    return null;
}
