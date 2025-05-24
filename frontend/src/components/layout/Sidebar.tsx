'use client';

import { useState } from 'react';
import { Menu, LogOut, Bell, CircleUserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebaseClient';
import { MAIN_NAV, ADMIN_NAV } from '@/lib/nav';
import CompanySwitcher from '@/components/CompanySwitcher';
import { useActiveCompany } from '@/lib/activeCompany';
import clsx from 'classnames';
import BuildInfo from '@/components/BuildInfo';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const active = useActiveCompany();

  const disabled = !active;

  /* ------------ reusable nav link ------------- */
  const NavLink = ({
    href,
    label,
    icon: Icon,
  }: (typeof MAIN_NAV)[number]) => (
    href = `/companies/${active?.id}/${href}`,
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

  /* -------------- render ----------------------- */
  return (
    <aside
      className={clsx(
        'h-full bg-[#121212] text-white flex flex-col shadow-lg transition-all duration-300',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      {/* collapse / expand */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="h-12 flex items-center justify-center hover:bg-white/10"
      >
        <Menu size={24} />
      </button>

      {/* company switcher */}
      <div className="px-2">
        <CompanySwitcher />
      </div>

      <div className="my-4 h-px bg-white/10 mx-4" />

      {/* -------- central scroll area (always flex-1) -------- */}
      <div className="flex-1 overflow-y-auto">
        {active && (
          <nav className="px-2 space-y-1">
            {MAIN_NAV.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}

            <div className="my-4 h-px bg-white/10" />

            {ADMIN_NAV.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        )}
      </div>

      {/* -------- bottom actions -------- */}
      <div className="p-2 space-y-2">
        {/* notifications */}
        <button
          className={clsx(
            'w-full h-10 flex items-center justify-center rounded',
            'hover:bg-white/10',
          )}
        >
          <Bell size={18} />
        </button>

        {/* profile */}
        <Link
          href={'/profile'}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2 rounded',
            'hover:bg-white/10',
          )}
        >
          {auth.currentUser?.photoURL ? (
            <img
              src={auth.currentUser.photoURL}
              alt="Me"
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <CircleUserRound size={20} />
          )}
          {!collapsed && (
            <span className="truncate">
              {auth.currentUser?.displayName ?? 'Profil'}
            </span>
          )}
        </Link>

        {/* sign-out */}
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
