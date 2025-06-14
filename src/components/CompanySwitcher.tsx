'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Plus, Building } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useCompanyList } from '@/lib/companyList';
import clsx from 'classnames';
import CreateCompanyForm from '@/components/CreateCompanyForm';
import { useTranslations } from 'next-intl';
import Avatar from '@/components/user/Avatar';
type Props = {
  collapsed?: boolean;
};

export default function CompanySwitcher({ collapsed = false }: Props) {
  const companies = useCompanyList();
  const { companyId } = useParams<{ companyId?: string }>();
  const active = companies.find((c) => c.id === companyId) ?? null;

  const router = useRouter();
  const t = useTranslations();

  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const label = active ? active.name : t('companySwitcher.selectOrCreate');

  // 🔒 Close dropdown when sidebar collapses
  useEffect(() => {
    if (collapsed) {
      setOpen(false);
    }
  }, [collapsed]);

  return (
    <>
      {/* ---------- trigger button ---------- */}
      <button
        onClick={() => {
          if (!collapsed) setOpen((o) => !o);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10"
      >
        {/* avatar / fallback icon */}
        {active?.logo_url ? (
          <img
            src={active.logo_url}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full grid place-items-center bg-white/10">
            <Building size={20} className="text-white/70" />
          </div>
        )}


        {!collapsed && (
          <>
            <span className="flex-1 text-left font-medium truncate">{label}</span>
            <ChevronDown
              size={18}
              className={clsx('transition-transform', open && 'rotate-180')}
            />
          </>
        )}
      </button>

      {/* ---------- dropdown panel ---------- */}
      {open && (
        <div className="mt-2 bg-[#1e1e1e] rounded shadow-lg divide-y divide-white/10">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setOpen(false);
                router.push(`/companies/${c.id}`);
              }}
              className={clsx(
                'flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10',
                c.id === companyId && 'bg-white/5'
              )}
            >
              {c.logo_url ? (
                <img src={c.logo_url} className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full grid place-items-center bg-white/10">
                  <Building size={16} className="text-white/70" />
                </div>
              )}
              <span className="truncate">{c.name}</span>
            </button>
          ))}

          <button
            onClick={() => {
              setOpen(false);
              setShowCreate(true);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10 text-primary"
          >
            <Plus size={18} />
            {t('companySwitcher.createNewCompany')}
          </button>
        </div>
      )}

      {/* ---------- create modal ---------- */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <CreateCompanyForm />
            <button
              onClick={() => setShowCreate(false)}
              className="mt-4 text-sm underline text-primary"
            >
              {t('companySwitcher.close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
