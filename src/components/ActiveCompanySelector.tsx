'use client';
import { useActiveCompany } from '@/lib/activeCompany';

export default function ActiveCompanySelector() {
  const { companies, active, setActive } = useActiveCompany();

  if (!active) return null;

  return (
    <select
      className="w-full h-10 bg-[#1e1e1e] text-white rounded px-3"
      value={active.id}
      onChange={(e) => {
        const sel = companies.find((c) => c.id === e.target.value);
        if (sel) setActive(sel);
      }}
    >
      {companies.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
