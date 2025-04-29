// src/components/CompanySwitcher.tsx
'use client';
import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useActiveCompany } from '@/lib/activeCompany';
import clsx from 'classnames';
import CreateCompanyForm from '@/components/CreateCompanyForm';

export default function CompanySwitcher() {
  const { companies, active, setActive } = useActiveCompany();
  const [open, setOpen]             = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  /* ---------- button v sidebaru ---------- */
  const label     = active ? active.name : 'Vybrat / vytvořit…';
  const avatarSrc = active?.logoURL ?? '/building.svg';

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10"
      >
        <img src={avatarSrc} alt="firma" className="w-8 h-8 rounded-full object-cover" />
        <span className="flex-1 text-left font-medium truncate">{label}</span>
        <ChevronDown size={18} className={clsx('transition-transform', open && 'rotate-180')} />
      </button>

      {/* ---------- dropdown ---------- */}
      {open && (
        <div className="mt-2 bg-[#1e1e1e] rounded shadow-lg divide-y divide-white/10">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActive(c); setOpen(false); }}
              className={clsx(
                'flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10',
                c.id === active?.id && 'bg-white/5',
              )}
            >
              <img src={c.logoURL ?? '/building.svg'} alt={c.name} className="w-6 h-6 rounded-full" />
              <span className="truncate">{c.name}</span>
            </button>
          ))}

          <button
            onClick={() => { setOpen(false); setShowCreate(true); }}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10 text-primary"
          >
            <Plus size={18} />  Vytvořit novou firmu
          </button>
        </div>
      )}

      {/* ---------- modální mini-form ---------- */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <CreateCompanyForm />
            <button
              onClick={() => setShowCreate(false)}
              className="mt-4 text-sm underline text-primary"
            >
              Zavřít
            </button>
          </div>
        </div>
      )}
    </>
  );
}
