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
import { MAIN_NAV, BOTTOM_NAV, type NavItem } from '@/lib/nav';
import CompanySwitcher from '@/components/CompanySwitcher';
import BuildInfo from '@/components/BuildInfo';
import UserInitialsIcon from '@/components/user/UserInitialsIcon';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';


function NavLink({
  item,
  activeCompanyId,
  disabled,
  collapsed,
  pathname,
  onMobileClick,
}: {
  item: NavItem;
  activeCompanyId?: string;
  disabled: boolean;
  collapsed: boolean;
  pathname: string;
  onMobileClick?: () => void;
}) {
  const target = item.global ? item.href : `/companies/${activeCompanyId}${item.href}`;
  const Icon = item.icon;
  const t = useTranslations();
  const isDisabled = item.global ? false : disabled;

  return (
    <Link
      href={isDisabled ? '#' : target}
      onClick={onMobileClick}
      className={clsx(
        'flex items-center gap-2 rounded',
        collapsed ? 'px-3 py-1' : 'px-3 py-2',
        isDisabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-primary-700 dark:hover:bg-gray-600',
        pathname === target && !isDisabled && 'bg-primary-700 dark:bg-primary-900/20 text-white dark:text-primary-300'
      )}
    >
      <Icon size={collapsed ? 20 : 18} />
      {!collapsed && <span>{t(item.labelKey)}</span>}
    </Link>
  );
}

function SidebarBottomSection({
  collapsed,
  onSignOut,
  onMobileClick,
  activeCompanyId,
  disabled,
  pathname,
}: {
  collapsed: boolean;
  onSignOut: () => Promise<void>;
  onMobileClick?: () => void;
  activeCompanyId?: string;
  disabled: boolean;
  pathname: string;
}) {
  const isMobileSidebar = !!onMobileClick;
  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name;
  const avatar = user?.user_metadata?.avatar_url;
  const t = useTranslations();
  const locale = useLocale();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  return (
    <div className="space-y-2 px-2 mb-3 flex flex-col w-full">
      {/* Marketplace */}
      <div className="space-y-1">
        {BOTTOM_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            activeCompanyId={activeCompanyId}
            disabled={disabled}
            collapsed={collapsed}
            pathname={pathname}
            onMobileClick={onMobileClick}
          />
        ))}
      </div>

      <div className="my-4 h-px bg-primary-700 dark:bg-gray-600" />

      {/* Notifications */}
      <div className="w-full">
        <NotificationBell showText={!collapsed} text={t('sidebar.notifications')} isMobileSidebar={isMobileSidebar} onMobileClick={onMobileClick} />
      </div>

      {/* Theme Toggle */}
      <div className="w-full ">
        <ThemeToggle collapsed={collapsed} />
      </div>

      {/* Profile Menu */}
      <div className="relative">
        <button
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'}`}
        >
          {avatar ? (
            <img src={avatar} alt="Me" className="w-8 h-8 min-w-8 min-h-8 rounded-full object-cover flex-shrink-0 aspect-square" />
          ) : (
            <UserInitialsIcon name={fullName} size={32} className="flex-shrink-0 aspect-square" />
          )}
          {!collapsed && (
            <span className="truncate">{fullName ?? 'Profil'}</span>
          )}
        </button>

        {profileMenuOpen && (
          <div className={`absolute bg-white dark:bg-gray-800 shadow-lg py-2 z-50 ${collapsed
            ? 'left-full bottom-0 ml-2 min-w-48'
            : 'bottom-full left-0 right-0 mb-2'
            }`}>
            <Link
              href={`/${locale}/profile`}
              onClick={() => {
                setProfileMenuOpen(false);
                onMobileClick?.();
              }}
              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t('sidebar.profile')}
            </Link>

            <hr className='m-1' />

            <div className="py-2">
              <LanguageSwitcher collapsed={false} />
            </div>

            <hr className='m-1' />

            <button
              onClick={() => {
                onSignOut();
                setProfileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t('sidebar.logout')}
            </button>
          </div>
        )}
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
  const [isClient, setIsClient] = useState(false);

  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name;
  const avatar = user?.user_metadata?.avatar_url;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
    if (typeof window === 'undefined') return;

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
        'h-full bg-primary-600 dark:bg-gray-700 text-white flex flex-col shadow-lg transition-[width] duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={clsx(
          'flex items-center justify-center hover:bg-primary-700 dark:hover:bg-gray-600',
          collapsed ? 'h-10' : 'h-12'
        )}
      >
        <Menu size={collapsed ? 20 : 24} />
      </button>

      <div>
        <CompanySwitcher collapsed={collapsed} />
      </div>

      <div className="my-4 h-px bg-primary-700 dark:bg-gray-600 mx-4" />

      <div className="flex-1 overflow-y-auto">
        <nav className="px-2 space-y-1">
          {MAIN_NAV.map((i) => (
            <NavLink
              key={i.href}
              item={i}
              activeCompanyId={active?.id}
              disabled={disabled}
              collapsed={collapsed}
              pathname={pathname}
            />
          ))}
        </nav>
      </div>

      <SidebarBottomSection
        collapsed={collapsed}
        onSignOut={async () => {
          await supabase.auth.signOut();
          router.push(`/${locale}/auth`);
        }}
        activeCompanyId={active?.id}
        disabled={disabled}
        pathname={pathname}
      />
    </aside>
  );

  const MobileSidebar = (
    <aside className="h-full bg-primary-600 dark:bg-gray-700 text-white flex flex-col shadow-lg w-screen max-w-screen-sm">
      <div className="flex justify-between flex-row h-14 px-4">
        <img src="/logo.png" alt="Metrics Hub logo" className="h-12 w-auto" />

        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto p-1 border-none hover:bg-primary-700 dark:hover:bg-gray-600"
        >
          <X size={24} />
        </button>
      </div>

      <div>
        <CompanySwitcher collapsed={false} onMobileClose={() => setMobileOpen(false)} />
      </div>

      <div className="my-4 h-px bg-primary-700 dark:bg-gray-600 mx-4" />

      <div className="flex-1 overflow-y-auto">
        <nav className="px-2 space-y-1">
          {MAIN_NAV.map((i) => (
            <NavLink
              key={i.href}
              item={i}
              activeCompanyId={active?.id}
              disabled={disabled}
              collapsed={false}
              pathname={pathname}
              onMobileClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>
      </div>

      <SidebarBottomSection
        collapsed={false}
        onSignOut={async () => {
          await supabase.auth.signOut();
          router.push(`/${locale}/auth`);
        }}
        onMobileClick={() => setMobileOpen(false)}
        activeCompanyId={active?.id}
        disabled={disabled}
        pathname={pathname}
      />
    </aside>
  );

  if (!isClient) {
    return (
      <>
        <div className="hidden md:block">
          <aside className="h-full bg-primary-600 dark:bg-gray-700 text-white flex flex-col shadow-lg w-64">
            <div className="h-12 flex items-center justify-center">
              <Menu size={24} />
            </div>
          </aside>
        </div>
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-primary-600 dark:bg-gray-700 text-white flex items-center justify-between px-4 py-3 shadow">
          <Menu size={24} />
          <div className="flex items-center gap-4">
            {avatar ? (
              <img src={avatar} alt="Me" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <UserInitialsIcon name={fullName} />
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="hidden md:block">{DesktopSidebar}</div>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-primary-600 dark:bg-gray-900 text-white flex items-center justify-between px-4 py-3 shadow">
        <button className="border-none" onClick={() => setMobileOpen(true)}>
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-4">
          <LanguageSwitcher collapsed={false} isMobileHeader />
          <NotificationBell />
          <Link
            href={`/${locale}/profile`}
            className="flex items-center rounded hover:bg-primary-700 dark:hover:bg-gray-600 p-2"
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
