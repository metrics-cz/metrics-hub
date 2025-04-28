'use client';

import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/auth');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full h-10 flex items-center justify-center rounded hover:bg-white/10"
      >
        <img
          src={auth.currentUser?.photoURL ?? '/avatar.svg'}
          alt="avatar"
          className="w-7 h-7 rounded-full object-cover"
        />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-40 bg-[#1e1e1e] text-sm p-2 rounded shadow-xl">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10 rounded"
          >
            <LogOut size={16} />  Odhlásit
          </button>
        </div>
      )}
    </div>
  );
}
