'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-bg-light">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
