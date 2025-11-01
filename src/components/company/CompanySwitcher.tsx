'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useCompanyList } from '@/lib/companyList';
import { useActiveCompany } from '@/lib/activeCompany';
import clsx from 'classnames';
import { useTranslations } from 'next-intl';
import CompanyInitialsIcon from './CompanyInitialsIcon';
import { updateLastSelectedCompany } from '@/lib/userPreferences';
import React, { Suspense } from 'react';
const CreateCompanyForm = React.lazy(() => import('@/components/company/CreateCompanyForm'))
type Props = {
 collapsed?: boolean;
 onMobileClose?: () => void;
};

export default function CompanySwitcher({ collapsed = false, onMobileClose }: Props) {
 const companies = useCompanyList();
 const { companyId } = useParams<{ companyId?: string }>();
 const active = useActiveCompany(); // Now uses enhanced logic with last selected company fallback

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
    className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 text-on-brand"
   >
    {/* avatar / fallback icon */}
    {active?.logo_url ? (
     <img
      src={active?.logo_url}
      className="w-8 h-8 rounded-full object-cover flex-shrink-0 aspect-square"
     />
    ) : (
     <CompanyInitialsIcon name={active?.name} size={32} />
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
    <div className="mt-2 bg-elevated rounded shadow-lg divide-y divide-white/10">
     {companies.map((c) => (
      <button
       key={c.id}
       onClick={async () => {
        setOpen(false);
        await updateLastSelectedCompany(c.id);
        router.push(`/companies/${c.id}`);
        onMobileClose?.();
       }}
       className={clsx(
        'flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10 text-primary',
        c.id === companyId && 'bg-white/5'
       )}
      >
       {c.logo_url ? (
        <img src={c.logo_url} className="w-6 h-6 rounded-full flex-shrink-0 aspect-square" />
       ) : (
        <CompanyInitialsIcon name={c.name} size={24} />
       )}
       <span className="truncate">{c.name}</span>
      </button>
     ))}

     <button
      onClick={() => {
       setOpen(false);
       setShowCreate(true);
      }}
      className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10 text-accent-text"
     >
      <Plus size={18} />
      {t('companySwitcher.createNewCompany')}
     </button>
    </div>
   )}

   {/* ---------- create modal ---------- */}
   {showCreate && (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
     <div className="bg-card rounded-xl p-6 w-full max-w-sm">
      <Suspense fallback={<div>Loading...</div>}>
       <CreateCompanyForm onClose={() => setShowCreate(false)} />
      </Suspense>
      <button
       onClick={() => setShowCreate(false)}
       className="mt-4 text-sm underline text-secondary"
      >
       {t('companySwitcher.close')}
      </button>
     </div>
    </div>
   )}
  </>
 );
}
