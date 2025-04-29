import {
    LayoutDashboard,
    Workflow,
    Users,
    Settings,
    CreditCard,
  } from 'lucide-react';
  
  export type NavItem = {
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number }>;
  };
  
  export const MAIN_NAV: NavItem[] = [
    { label: 'Aplikace',                  href: '/app',          icon: LayoutDashboard },
    { label: 'Integrace a automatizace',  href: '/integrations', icon: Workflow        },
  ];
  
  export const ADMIN_NAV: NavItem[] = [
    { label: 'Správa uživatelů', href: '/users',    icon: Users     },
    { label: 'Nastavení firmy',  href: '/settings', icon: Settings  },
    { label: 'Fakturace',        href: '/billing',  icon: CreditCard},
  ];
  