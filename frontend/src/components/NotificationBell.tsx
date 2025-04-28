'use client';

import { Bell } from 'lucide-react';
import { useState } from 'react';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full h-10 flex items-center justify-center rounded hover:bg-white/10"
      >
        <Bell size={18} />
      </button>

      {/* drobný placeholder na notifikace */}
      {open && (
        <div className="absolute right-0 top-12 w-64 bg-[#1e1e1e] text-sm p-4 rounded shadow-xl">
          <p className="text-neutral-400 italic">Žádné notifikace</p>
        </div>
      )}
    </div>
  );
}
