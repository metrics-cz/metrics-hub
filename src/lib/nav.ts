import {
  LayoutDashboard,
  Workflow,
  Users,
  Settings,
  CreditCard,
  Building,
  Store,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  labelKey: string; // changed from label to labelKey
  href: string;
  icon: LucideIcon;
  global?: boolean; // true for global routes, false/undefined for company-scoped routes
};

/* ---------- hlavní menu ---------- */
export const MAIN_NAV: NavItem[] = [
  { labelKey: 'nav.dashboard',      href: '',               icon: LayoutDashboard },
  { labelKey: 'nav.applications',   href: '/apps',          icon: Building },
  { labelKey: 'nav.integrations',   href: '/integrations',  icon: Workflow        },
  { labelKey: 'nav.users',          href: '/users',         icon: Users           },
  { labelKey: 'nav.settings',       href: '/settings',      icon: Settings        },
  { labelKey: 'nav.billing',        href: '/billing',       icon: CreditCard      },
];

/* ---------- bottom section ---------- */
export const BOTTOM_NAV: NavItem[] = [
  { labelKey: 'nav.marketplace',    href: '/marketplace',   icon: Store,          global: true },
];
