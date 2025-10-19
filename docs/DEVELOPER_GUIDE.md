# Metrics Hub - Developer Guide

Welcome to Metrics Hub! This guide will help you understand the codebase structure and contribute effectively.

## 📚 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Component Organization](#component-organization)
- [Common Patterns](#common-patterns)
- [Adding New Features](#adding-new-features)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Strategy](#testing-strategy)

---

## 🎯 Project Overview

Metrics Hub is a modern dashboard application for managing company integrations, monitoring metrics, and tracking automation executions. Built with Next.js 15, React 19, and Supabase.

### Key Features
- Multi-company management with role-based access control
- Integration marketplace with OAuth support
- Plugin system with iframe-based execution
- Real-time logging and monitoring
- Internationalization (i18n) support

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.9
- **UI Library**: React 19
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **i18n**: next-intl
- **Icons**: Lucide React

---

## 📁 Project Structure

```
metrics-hub-supabase/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── [locale]/            # Internationalized routes
│   │   │   ├── (dashboard)/     # Protected dashboard routes
│   │   │   ├── auth/            # Authentication pages
│   │   │   └── page.tsx         # Landing page
│   │   ├── api/                 # API routes
│   │   │   ├── companies/       # Company-related endpoints
│   │   │   ├── plugins/         # Plugin proxy endpoints
│   │   │   └── proxy/           # Google Ads proxy
│   │   └── layout.tsx           # Root layout
│   │
│   ├── components/              # React components (domain-organized)
│   │   ├── auth/               # Authentication components
│   │   ├── common/             # Shared utilities
│   │   ├── company/            # Company-related components
│   │   │   ├── integrations/  # Integration settings components
│   │   │   └── *.tsx          # Company management UI
│   │   ├── integration-logs/   # Log viewing components
│   │   ├── layout/            # Navigation & layout
│   │   ├── providers/         # Context providers
│   │   ├── ui/                # Generic UI primitives
│   │   └── user/              # User management UI
│   │
│   ├── lib/                    # Core utilities & services
│   │   ├── auth.ts            # Authentication helpers
│   │   ├── cachedApi.ts       # API client with caching
│   │   ├── encryption.ts      # Token encryption
│   │   ├── permissions.ts     # Role-based access control
│   │   ├── prisma.ts          # Database client
│   │   └── supabase*.ts       # Supabase clients
│   │
│   ├── locales/               # i18n translation files
│   │   ├── en.json
│   │   └── cz.json
│   │
│   └── middleware.ts          # Next.js middleware (i18n, auth)
│
├── prisma/                    # Database schema
├── public/                    # Static assets
├── supabase/                  # Supabase migrations & config
└── scripts/                   # Utility scripts
```

---

## 🧩 Component Organization

### Domain-Based Structure

Components are organized by **business domain**, not by technical type. This makes it easier to find related code.

#### `/components` Structure

```
components/
├── auth/
│   └── AuthProvider.tsx        # Auth context provider
│
├── common/
│   ├── ErrorBoundary.tsx       # Error handling
│   ├── Spinner.tsx             # Loading states
│   ├── BlockingScreen.tsx      # Full-page overlays
│   └── BuildInfo.tsx           # Version display
│
├── company/
│   ├── integrations/           # Integration-specific UI
│   │   ├── NotificationInput.tsx
│   │   ├── MetricConfig.tsx
│   │   ├── FrequencySelector.tsx
│   │   └── AccountSelector.tsx
│   ├── CompanySwitcher.tsx     # Company selection dropdown
│   ├── CreateCompanyForm.tsx   # Company creation
│   ├── LogoUpload.tsx          # Company branding
│   └── GoogleOAuthSettings.tsx # OAuth configuration
│
├── integration-logs/
│   ├── LogsViewer.tsx          # Universal log viewer
│   └── IntegrationResultsWidget.tsx
│
├── layout/
│   ├── Sidebar.tsx             # Main navigation
│   ├── NotificationBell.tsx    # Notification dropdown
│   ├── LanguageSwitcher.tsx    # Locale switcher
│   └── ThemeToggle.tsx         # Dark mode toggle
│
├── providers/
│   ├── ThemeProvider.tsx       # Theme context
│   ├── LocaleProvider.tsx      # i18n provider
│   └── NotificationProvider.tsx # Real-time notifications
│
├── ui/                         # Radix UI components
│   ├── button.tsx
│   ├── input.tsx
│   └── ...
│
└── user/
    ├── Avatar.tsx              # User avatar display
    ├── UserTable.tsx           # User management
    └── UserRow.tsx             # Table row component
```

### Why Domain-Based?

**✅ Benefits:**
- Find all company-related code in one place
- Easier to understand feature boundaries
- Reduces cognitive load for new developers
- Natural grouping for feature work

**Example:** Need to modify integration settings?
- Everything is in `components/company/integrations/`
- Page is at `app/[locale]/(dashboard)/companies/[companyId]/integrations/[integrationId]/settings/`

---

## 🎨 Common Patterns

### 1. Reusable Components

When you see repetitive code, extract it into a reusable component:

**❌ Bad (Repetitive):**
```tsx
// Email notification
<div>
  <input type="checkbox" checked={email.enabled} onChange={...} />
  {email.enabled && <input type="email" value={email.address} />}
</div>

// Slack notification (same pattern!)
<div>
  <input type="checkbox" checked={slack.enabled} onChange={...} />
  {slack.enabled && <input type="url" value={slack.webhook} />}
</div>
```

**✅ Good (Reusable):**
```tsx
<NotificationInput
  type="email"
  enabled={settings.email.enabled}
  value={settings.email.address}
  onEnabledChange={(enabled) => updateSettings({ email: { enabled } })}
  onValueChange={(address) => updateSettings({ email: { address } })}
/>

<NotificationInput type="slack" ... />
```

### 2. Error Handling

Use the centralized error handler in `cachedApi.ts`:

```typescript
async function fetchData(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    await handleFetchError(response, 'fetch data');
  }

  return response.json();
}
```

### 3. State Management

For form-heavy components, prefer controlled state with clear update handlers:

```tsx
// ✅ Good: Clear, single-purpose handlers
<MetricConfig
  name="impressions"
  enabled={settings.metrics.impressions.enabled}
  threshold={settings.metrics.impressions.threshold}
  onEnabledChange={(enabled) => updateMetric('impressions', { enabled })}
  onThresholdChange={(threshold) => updateMetric('impressions', { threshold })}
/>

// ❌ Bad: Complex nested updates in JSX
<input onChange={(e) => setSettings(prev => ({
  ...prev,
  metrics: {
    ...prev.metrics,
    impressions: {
      ...prev.metrics.impressions,
      enabled: e.target.checked
    }
  }
}))} />
```

### 4. API Routes

Follow this pattern for API endpoints:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, checkCompanyPermission } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;

    // 1. Authenticate
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check permissions
    const permission = await checkCompanyPermission(authResult.user.id, companyId);
    if (!permission.hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Business logic
    const data = await fetchSomeData(companyId);

    // 4. Return response
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5. Authentication

Use the auth helpers consistently:

```tsx
// Client-side
import { useAuth } from '@/components/auth/AuthProvider';

function MyComponent() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <LoginPrompt />;

  return <div>Welcome {user.email}</div>;
}

// Server-side API
import { authenticateRequest } from '@/lib/auth';

const authResult = await authenticateRequest(request);
if (!authResult.success || !authResult.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## ➕ Adding New Features

### Creating a New Integration Component

**1. Create the component in the right location:**

```typescript
// src/components/company/integrations/MyNewComponent.tsx
'use client';

interface MyNewComponentProps {
  value: string;
  onChange: (value: string) => void;
}

export function MyNewComponent({ value, onChange }: MyNewComponentProps) {
  return (
    <div>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
```

**2. Use it in the settings page:**

```tsx
import { MyNewComponent } from '@/components/company/integrations/MyNewComponent';

<MyNewComponent
  value={settings.myValue}
  onChange={(myValue) => setSettings(prev => ({ ...prev, myValue }))}
/>
```

### Adding a New API Endpoint

**1. Create the route file:**
```typescript
// src/app/api/companies/[companyId]/my-feature/route.ts
export async function GET(request: NextRequest, { params }) { ... }
```

**2. Add to cachedApi if needed:**
```typescript
// src/lib/cachedApi.ts
async fetchMyFeature(companyId: string) {
  const cacheKey = `my-feature:${companyId}`;
  return requestCache.get(cacheKey, async () => {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`/api/companies/${companyId}/my-feature`, { headers });
    if (!response.ok) await handleFetchError(response, 'fetch my feature');
    return response.json();
  });
}
```

### Adding a New Page

**1. Create the page file:**
```tsx
// src/app/[locale]/(dashboard)/my-feature/page.tsx
'use client';

export default function MyFeaturePage() {
  return <div>My Feature</div>;
}
```

**2. Add navigation link:**
```tsx
// src/lib/nav.ts
export const navItems = [
  // ...existing items
  { href: '/my-feature', label: 'My Feature', icon: Star }
];
```

---

## 💅 Code Style Guidelines

### Naming Conventions

- **Components**: PascalCase - `NotificationInput.tsx`
- **Files**: kebab-case for utilities - `cached-api.ts`
- **Functions**: camelCase - `handleFetchError()`
- **Constants**: UPPER_SNAKE_CASE - `FREQUENCY_PRICING`
- **Types/Interfaces**: PascalCase - `IntegrationSettings`

### Component Structure

```tsx
'use client'; // If needed

import { useState } from 'react';
import { ExternalLib } from 'external-lib';
import { InternalUtil } from '@/lib/utils';
import { OtherComponent } from '@/components/...';

// Types/Interfaces
interface MyComponentProps {
  value: string;
  onChange: (value: string) => void;
}

// Constants (if local to file)
const DEFAULT_VALUE = 'default';

/**
 * Component description
 * Explain what this component does and when to use it
 */
export function MyComponent({ value, onChange }: MyComponentProps) {
  // 1. Hooks
  const [localState, setLocalState] = useState('');

  // 2. Derived values
  const displayValue = value || DEFAULT_VALUE;

  // 3. Handlers
  const handleChange = (newValue: string) => {
    setLocalState(newValue);
    onChange(newValue);
  };

  // 4. Render
  return (
    <div>
      <input value={displayValue} onChange={(e) => handleChange(e.target.value)} />
    </div>
  );
}
```

### TypeScript Best Practices

- **Always use types** for component props
- **Avoid `any`** - use `unknown` and type guards instead
- **Use generics** for reusable utilities
- **Prefer interfaces** for object shapes
- **Use const assertions** for literal types

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'owner';
}

// ✅ Good
const ROLES = ['admin', 'member', 'owner'] as const;
type Role = typeof ROLES[number];

// ❌ Bad
const user: any = { ... };
```

### File Organization

**Keep files focused:**
- Maximum ~500 lines per component
- Extract helpers into separate files
- Split large components into smaller ones
- Group related utilities

**Example: Large component → Multiple files**
```
components/integration-logs/
├── LogsViewer.tsx           # Main component
├── FilterPanel.tsx          # Extracted filter UI
├── LogEntry.tsx             # Individual log rendering
└── useLogFilters.ts         # Custom hook for filter logic
```

---

## 🧪 Testing Strategy

### Before Committing

Always run these checks:

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build

# Test locally
npm run dev
```

### Manual Testing Checklist

When modifying integration features:
1. ✅ Test login flow
2. ✅ Switch between companies
3. ✅ Access integration settings
4. ✅ Modify and save settings
5. ✅ Check integration logs
6. ✅ Test in both light/dark themes
7. ✅ Test in both English and Czech locales

### Integration Testing

For critical paths, test:
- OAuth flow (Google Ads, Analytics, etc.)
- Plugin installation/uninstallation
- Settings persistence
- Real-time log updates
- Permission boundaries (different user roles)

---

## 🔐 Security Guidelines

### Never Commit Secrets

- Use `.env.local` for local development
- Use environment variables for production
- Never hardcode API keys or tokens
- Encrypt sensitive data with `encryption.ts`

### Authentication

- Always check authentication in API routes
- Verify company permissions before data access
- Use `authenticateRequest()` and `checkCompanyPermission()`
- Never trust client-side authentication state alone

### Input Validation

- Validate all user inputs with Zod
- Sanitize file paths for plugin uploads
- Check permissions before file operations
- Validate webhook URLs before storing

---

## 📖 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

---

## 🤝 Getting Help

If you're stuck:

1. Check this guide
2. Review similar components in the codebase
3. Check the CLAUDE.md for project-specific context
4. Ask the team in Slack/Discord
5. Create an issue in GitHub

---

## 📝 Contributing Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Follow code style guidelines
   - Keep commits focused and atomic
   - Write clear commit messages

3. **Test thoroughly**
   - Run type checks
   - Test locally
   - Verify integrations work

4. **Commit with proper message**
   ```bash
   git commit -m "Add notification input component

   - Extract reusable notification UI
   - Support email, Slack, Discord, WhatsApp
   - Reduce duplication in settings page"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   ```

---

**Happy coding! 🚀**
