'use client';

import ActiveCompanySelector from '@/components/ActiveCompanySelector';
import NotificationBell      from '@/components/NotificationBell';
import UserMenu              from '@/components/UserMenu';
import { Menu } from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <aside
      className={`h-full bg-[#121212] text-white flex flex-col shadow-lg transition-all duration-300 ${
        open ? 'w-60' : 'w-20'
      }`}
    >
      {/* toggle */}
      <button onClick={() => setOpen(!open)} className="h-12 flex items-center justify-center hover:bg-white/10">
        <Menu size={24} />
      </button>

      {/* content */}
      <div className="flex-1 p-2 space-y-4 overflow-y-auto">
        <ActiveCompanySelector />
        {/* …další odkazy později */}
      </div>

      {/* bottom */}
      <div className="p-2 space-y-2">
        <NotificationBell />
        <UserMenu />
      </div>
    </aside>
  );
}
