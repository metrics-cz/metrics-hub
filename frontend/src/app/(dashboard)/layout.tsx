// src/app/(dashboard)/layout.tsx
'use client';
import type { ReactNode } from 'react';
import { ActiveCompanyProvider, useActiveCompany } from '@/lib/activeCompany';
import RootLayout from '@/components/layout/RootLayout';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ActiveCompanyProvider>
      <Content>{children}</Content>
    </ActiveCompanyProvider>
  );
}

function Content({ children }: { children: ReactNode }) {
  const { active } = useActiveCompany();

  return (
    <RootLayout>
      {/* není-li vybraná firma, necháme uživatele vybrat vlevo nahoře */}
      {active ? children : <EmptyState />}
    </RootLayout>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-neutral-500">
      Vyberte (nebo založte) firmu vlevo nahoře…
    </div>
  );
}
