'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Menu,
  LogOut,
  Bell,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import clsx from 'classnames';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider';
import { useActiveCompany } from '@/lib/activeCompany';
import { MAIN_NAV, ADMIN_NAV } from '@/lib/nav';
import CompanySwitcher from '@/components/CompanySwitcher';
import BuildInfo from '@/components/BuildInfo';
import UserInitialsIcon from '@/components/user/UserInitialsIcon';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

function NavLink({
  item,
  activeCompanyId,
  disabled,
  collapsed,
  pathname,
}: {
  item: NavItem;
  activeCompanyId?: string;
  disabled: boolean;
  collapsed: boolean;
  pathname: string;
}) {
  const target = `/companies/${activeCompanyId}${item.href}`;
  const Icon = item.icon;
  const t = useTranslations();
  return (
    <Link
      href={disabled ? '#' : target}
      className={clsx(
        'flex items-center gap-2 rounded',
        collapsed ? 'px-2 py-1' : 'px-3 py-2',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-white/10',
        pathname === target && !disabled && 'bg-white/10'
      )}
    >
      <Icon size={collapsed ? 20 : 18} />
      {!collapsed && <span>{t(item.labelKey)}</span>}
    </Link>
  );
}

function SidebarActions({
  collapsed,
  onSignOut,
}: {
  collapsed: boolean;
  onSignOut: () => Promise<void>;
}) {
  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name;
  const avatar = user?.user_metadata?.avatar_url;

  return (
    <div className="space-y-2 px-2 flex flex-col items-center gap-1 mt-2 w-full">
      {collapsed ? (
        <div className="flex flex-col items-center gap-3 px-3 py-2">
          <LanguageSwitcher collapsed={collapsed} />
          <button className="w-full h-10 flex items-center justify-center rounded hover:bg-white/10">
            <Bell size={18} />
          </button>
        </div>
      ) : (
        <div className="w-full flex flex-row">
          <LanguageSwitcher collapsed={collapsed} />
          <button className="w-full h-10 flex items-center justify-center rounded hover:bg-white/10 ml-2">
            <Bell size={18} />
          </button>
        </div>
      )}

      <Link
        href="/profile"
        className="w-full flex items-center gap-3 px-3 rounded hover:bg-white/10"
      >
        {avatar ? (
          <img src={avatar} alt="Me" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <UserInitialsIcon name={fullName} />
        )}
        {!collapsed && (
          <span className="truncate">{fullName ?? 'Profil'}</span>
        )}
      </Link>

      <button
        onClick={onSignOut}
        className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-white/10 text-red-400"
      >
        <LogOut size={18} />
        {!collapsed && <span>Odhlásit se</span>}
      </button>

      <div className="text-center mt-3">
        <BuildInfo />
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const active = useActiveCompany();
  const disabled = !active;

  const t = useTranslations();
  const locale = useLocale();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name;
  const avatar = user?.user_metadata?.avatar_url;
  
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handle = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setMobileOpen(false);
    };
    handle(mq);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  const escHandler = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setMobileOpen(false);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.addEventListener('keydown', escHandler);
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', escHandler);
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', escHandler);
      document.documentElement.style.overflow = '';
    };
  }, [mobileOpen, escHandler]);

  const SWIPE_CLOSE_OFFSET = 120;
  const SWIPE_CLOSE_VELOCITY = 800;

  const DesktopSidebar = (
    <aside
      className={clsx(
        'h-full bg-[#121212] text-white flex flex-col shadow-lg transition-[width] duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={clsx(
          'flex items-center justify-center hover:bg-white/10',
          collapsed ? 'h-10' : 'h-12'
        )}
      >
        <Menu size={collapsed ? 20 : 24} />
      </button>

      <div className="px-2">
        <CompanySwitcher collapsed={collapsed} />
      </div>

      <div className="my-4 h-px bg-white/10 mx-4" />

      <div className="flex-1 overflow-y-auto">
        {active && (
          <nav className="px-2 space-y-1">
            {MAIN_NAV.map((i) => (
              <NavLink
                key={i.href}
                item={i}
                activeCompanyId={active.id}
                disabled={disabled}
                collapsed={collapsed}
                pathname={pathname}
              />
            ))}
            <div className="my-4 h-px bg-white/10" />
            {ADMIN_NAV.map((i) => (
              <NavLink
                key={i.href}
                item={i}
                activeCompanyId={active.id}
                disabled={disabled}
                collapsed={collapsed}
                pathname={pathname}
              />
            ))}
          </nav>
        )}
      </div>

      <SidebarActions
        collapsed={collapsed}
        onSignOut={async () => {
          await supabase.auth.signOut();
          router.push('/auth');
        }}
      />
    </aside>
  );

  const MobileSidebar = (
    <aside className="h-full bg-[#121212] text-white flex flex-col shadow-lg w-screen max-w-screen-sm">
      <div className="flex justify-between flex-row h-14 px-4">
        <img src="/logo.png" alt="Metrics Hub logo" className="h-25 w-auto" />

        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto p-1 rounded border-none hover:bg-white/10"
        >
          <X size={24} />
        </button>
      </div>

      <div className="px-2">
        <CompanySwitcher collapsed={false} />
      </div>

      <div className="my-4 h-px bg-white/10 mx-4" />

      <div className="flex-1 overflow-y-auto">
        {active && (
          <nav className="px-2 space-y-1">
            {MAIN_NAV.map((i) => (
              <NavLink
                key={i.href}
                item={i}
                activeCompanyId={active.id}
                disabled={disabled}
                collapsed={false}
                pathname={pathname}
              />
            ))}
            <div className="my-4 h-px bg-white/10" />
            {ADMIN_NAV.map((i) => (
              <NavLink
                key={i.href}
                item={i}
                activeCompanyId={active.id}
                disabled={disabled}
                collapsed={false}
                pathname={pathname}
              />
            ))}
          </nav>
        )}
      </div>

      <SidebarActions
        collapsed={false}
        onSignOut={async () => {
          await supabase.auth.signOut();
          router.push('/auth');
        }}
      />
    </aside>
  );

  return (
    <>
      <div className="hidden md:block">{DesktopSidebar}</div>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#121212] text-white flex items-center justify-between px-4 py-3 shadow">
        <button className="border-none" onClick={() => setMobileOpen(true)}>
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-4">
          <LanguageSwitcher collapsed={false} isMobileHeader />
          <button className="border-none">
            <Bell size={20} />
          </button>
           <Link
        href="/profile"
        className="w-full flex items-center gap-3 px-3 rounded hover:bg-white/10"
      >
        {avatar ? (
          <img src={avatar} alt="Me" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <UserInitialsIcon name={fullName} />
        )}
      </Link>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="drawer-wrapper"
            className="fixed inset-0 z-50 flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="flex-1 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="relative"
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                const { offset, velocity } = info;
                if (offset.x > SWIPE_CLOSE_OFFSET || velocity.x > SWIPE_CLOSE_VELOCITY) {
                  setMobileOpen(false);
                }
              }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
            >
              {MobileSidebar}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
