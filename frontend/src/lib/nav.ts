import {
  LayoutDashboard,
  Workflow,
  Users,
  Settings,
  CreditCard,
  Building,          // ⬅️ NEW – Lucide pictogram
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/* ---------- hlavní menu ---------- */
export const MAIN_NAV: NavItem[] = [
  { label: 'Aplikace',                 href: '/app',          icon: LayoutDashboard },
  { label: 'Integrace a automatizace', href: '/integrations', icon: Workflow        },
];

/* ---------- admin sekce ---------- */
export const ADMIN_NAV: NavItem[] = [
  { label: 'Správa uživatelů', href: '/users',    icon: Users       },
  { label: 'Nastavení firmy',  href: '/settings', icon: Settings    },
  { label: 'Fakturace',        href: `/companies/`,  icon: CreditCard  },
];
