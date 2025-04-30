'use client';

import { useState } from 'react';
import { Menu, LogOut, Bell } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { MAIN_NAV, ADMIN_NAV } from '@/lib/nav';
import CompanySwitcher from '@/components/CompanySwitcher';
import { useActiveCompany } from '@/lib/activeCompany';
import clsx from 'classnames';
import BuildInfo from '@/components/BuildInfo'; 


export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname                  = usePathname();
  const router                    = useRouter();
  const { active }                = useActiveCompany();   // <-- nově
  const disabled                  = !active;              // žádná aktivní firma

  /* ------- interní link ------------------------- */
  const NavLink = ({
    href,
    label,
    icon: Icon,
  }: (typeof MAIN_NAV)[number]) => (
    <Link
      href={disabled ? '#' : href}
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:bg-white/10',
        pathname === href && !disabled && 'bg-white/10',
      )}
    >
      <Icon size={18} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  /* ------- vlastní render ----------------------- */
  return (
    <aside
      className={clsx(
        'h-full bg-[#121212] text-white flex flex-col shadow-lg transition-all duration-300',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      {/* toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="h-12 flex items-center justify-center hover:bg-white/10"
      >
        <Menu size={24} />
      </button>

      {/* switcher firmy */}
      <div className="px-2">
        <CompanySwitcher />
      </div>

      {/* separator */}
      <div className="my-4 h-px bg-white/10 mx-4" />

      {/* primární navigace */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {MAIN_NAV.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        {/* admin sekce */}
        <div className="my-4 h-px bg-white/10" />
        {ADMIN_NAV.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* spodní oblast */}
      <div className="p-2 space-y-2">
        {/* notifikace */}
        <button
          className={clsx(
            'w-full h-10 flex items-center justify-center rounded',
            disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10',
          )}
          disabled={disabled}
        >
          <Bell size={18} />
        </button>

        {/* profil */}
        <Link
          href={disabled ? '#' : '/profile'}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2 rounded',
            disabled
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-white/10',
          )}
        >
          <img
            src={auth.currentUser?.photoURL ?? '/avatar.svg'}
            alt="Me"
            className="w-8 h-8 rounded-full object-cover"
          />
          {!collapsed && (
            <span className="truncate">
              {auth.currentUser?.displayName ?? 'Profil'}
            </span>
          )}
        </Link>

        {/* odhlášení (vždy aktivní) */}
        <button
          onClick={async () => {
            await signOut(auth);
            router.push('/auth');
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-white/10 text-red-400"
        >
          <LogOut size={18} />
          {!collapsed && <span>Odhlásit se</span>}
        </button>
        <div className="text-center mt-3">
          <BuildInfo />
        </div>
      </div>
    </aside>
  );
}
