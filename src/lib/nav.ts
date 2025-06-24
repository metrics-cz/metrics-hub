import {
  LayoutDashboard,
  Workflow,
  Users,
  Settings,
  CreditCard,
  Building,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  labelKey: string; // changed from label to labelKey
  href: string;
  icon: LucideIcon;
};

/* ---------- hlavní menu ---------- */
export const MAIN_NAV: NavItem[] = [
  { labelKey: 'nav.dashboard',      href: '',               icon: LayoutDashboard },
  { labelKey: 'nav.apps',           href: '/apps',          icon: Building },
  { labelKey: 'nav.integrations',   href: '/integrations',  icon: Workflow        },
];

/* ---------- admin sekce ---------- */
export const ADMIN_NAV: NavItem[] = [
  { labelKey: 'nav.users',      href: '/users',    icon: Users       },
  { labelKey: 'nav.settings',   href: '/settings', icon: Settings    },
  { labelKey: 'nav.invoices',   href: '/invoices', icon: CreditCard  },
];
