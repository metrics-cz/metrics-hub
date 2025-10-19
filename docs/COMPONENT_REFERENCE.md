# Component Reference Guide

Quick reference for all reusable components in the codebase.

## 📍 Component Locations

All components are organized by **business domain** in `src/components/`:

```
components/
├── auth/                   Authentication
├── common/                 Shared utilities
├── company/               Company management
│   └── integrations/      Integration settings
├── integration-logs/      Log viewing
├── layout/               Navigation & UI chrome
├── providers/            React contexts
├── ui/                   Generic primitives
└── user/                 User management
```

---

## 🔐 Authentication Components

### `<AuthProvider>`
**Location**: `components/auth/AuthProvider.tsx`

Global authentication context provider.

```tsx
import { AuthProvider } from '@/components/auth/AuthProvider';

function App() {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
```

**Hook Usage**:
```tsx
import { useAuth } from '@/components/auth/AuthProvider';

function MyComponent() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <LoginPrompt />;

  return <div>Hello {user.email}</div>;
}
```

**Provided Values**:
- `user` - Current user object or null
- `loading` - Boolean, true while checking auth
- `signOut` - Function to log out

---

## 🏢 Company Components

### `<CompanySwitcher>`
**Location**: `components/company/CompanySwitcher.tsx`

Dropdown for switching between companies user has access to.

```tsx
<CompanySwitcher collapsed={false} onMobileClose={() => {}} />
```

**Props**:
- `collapsed?: boolean` - Collapsed sidebar mode
- `onMobileClose?: () => void` - Callback for mobile menu close

### `<CreateCompanyForm>`
**Location**: `components/company/CreateCompanyForm.tsx`

Form for creating a new company.

```tsx
<CreateCompanyForm onClose={() => setShowForm(false)} />
```

**Props**:
- `onClose: () => void` - Called when form is closed

### `<LogoUpload>`
**Location**: `components/company/LogoUpload.tsx`

Company logo upload and management.

```tsx
<LogoUpload companyId={company.id} currentLogoUrl={company.logo_url} />
```

---

## 🔌 Integration Components

### `<NotificationInput>`
**Location**: `components/company/integrations/NotificationInput.tsx`

Reusable notification configuration input (email, Slack, Discord, WhatsApp).

```tsx
<NotificationInput
  type="email" // or 'slack' | 'discord' | 'whatsapp'
  enabled={settings.email.enabled}
  value={settings.email.address}
  onEnabledChange={(enabled) => update({ enabled })}
  onValueChange={(address) => update({ address })}
/>
```

**Props**:
- `type: 'email' | 'slack' | 'discord' | 'whatsapp'`
- `enabled: boolean` - Checkbox state
- `value: string` - Input value (email or webhook URL)
- `onEnabledChange: (enabled: boolean) => void`
- `onValueChange: (value: string) => void`

**Automatically handles**:
- ✅ Correct input type (email vs URL)
- ✅ Placeholder text
- ✅ Label display
- ✅ Conditional visibility

### `<MetricConfig>`
**Location**: `components/company/integrations/MetricConfig.tsx`

Metric monitoring configuration with threshold.

```tsx
<MetricConfig
  name="impressions"
  enabled={metric.enabled}
  dropThreshold={metric.threshold}
  onEnabledChange={(enabled) => updateMetric({ enabled })}
  onThresholdChange={(threshold) => updateMetric({ threshold })}
/>
```

**Props**:
- `name: string` - Metric display name
- `enabled: boolean` - Monitoring enabled
- `dropThreshold: number` - Percentage threshold (1-100)
- `onEnabledChange: (enabled: boolean) => void`
- `onThresholdChange: (threshold: number) => void`

### `<FrequencySelector>`
**Location**: `components/company/integrations/FrequencySelector.tsx`

Execution frequency selector with pricing display.

```tsx
<FrequencySelector
  selected="24h"
  pricing={{ '4h': 50, '8h': 40, '12h': 30, '24h': 20, '48h': 15 }}
  onChange={(frequency) => setFrequency(frequency)}
/>
```

**Props**:
- `selected: '4h' | '8h' | '12h' | '24h' | '48h'`
- `pricing: Record<string, number>` - Price per frequency
- `onChange: (frequency) => void`

### `<AccountSelector>`
**Location**: `components/company/integrations/AccountSelector.tsx`

Google Ads account type selector (MCC vs Direct).

```tsx
<AccountSelector
  accountType="mcc"
  mccEmail="myaccount@gmail.com"
  onChange={(type) => setAccountType(type)}
/>
```

**Props**:
- `accountType: 'mcc' | 'direct'`
- `mccEmail?: string` - Display MCC email if applicable
- `onChange: (type: 'mcc' | 'direct') => void`

---

## 📊 Logging Components

### `<LogsViewer>`
**Location**: `components/integration-logs/LogsViewer.tsx`

Universal integration logs viewer with filtering and real-time updates.

```tsx
<LogsViewer
  companyId={companyId}
  integrationName="google-ads-anomaly-watchdog"
  executionRunId={runId}
  height="600px"
  showFilters={true}
  showExport={true}
  autoRefresh={true}
  refreshInterval={5000}
/>
```

**Props**:
- `companyId: string` - Required
- `integrationName?: string` - Filter by integration
- `executionRunId?: string` - Filter by execution run
- `height?: string` - Container height (default: '600px')
- `showFilters?: boolean` - Show filter panel (default: true)
- `showExport?: boolean` - Show export button (default: true)
- `autoRefresh?: boolean` - Enable auto-refresh (default: false)
- `refreshInterval?: number` - Refresh interval in ms (default: 5000)

**Features**:
- ✅ Advanced filtering (level, source, category, date range)
- ✅ Full-text search
- ✅ Export to CSV
- ✅ Expandable log details
- ✅ Performance metrics display
- ✅ Integration-specific success metrics

---

## 🎨 Layout Components

### `<Sidebar>`
**Location**: `components/layout/Sidebar.tsx`

Main navigation sidebar.

```tsx
<Sidebar />
```

**Features**:
- Company switcher
- Navigation links
- Theme toggle
- Language switcher
- Responsive (mobile drawer)

### `<NotificationBell>`
**Location**: `components/layout/NotificationBell.tsx`

Notification dropdown with unread count.

```tsx
<NotificationBell />
```

**Features**:
- Real-time notifications
- Unread count badge
- Mark as read/unread
- Notification types (success, error, info)

### `<ThemeToggle>`
**Location**: `components/layout/ThemeToggle.tsx`

Theme switcher (light/dark/system).

```tsx
<ThemeToggle collapsed={false} position="sidebar" />
```

**Props**:
- `collapsed?: boolean` - Collapsed mode
- `position?: 'sidebar' | 'auth-page'` - UI variant

### `<LanguageSwitcher>`
**Location**: `components/layout/LanguageSwitcher.tsx`

Language/locale selector.

```tsx
<LanguageSwitcher collapsed={false} />
```

---

## 🌐 Provider Components

### `<ThemeProvider>`
**Location**: `components/providers/ThemeProvider.tsx`

Theme context provider.

```tsx
import { ThemeProvider } from '@/components/providers/ThemeProvider';

<ThemeProvider>
  {children}
</ThemeProvider>
```

**Hook Usage**:
```tsx
import { useTheme } from '@/components/providers/ThemeProvider';

function MyComponent() {
  const { theme, setTheme, actualTheme } = useTheme();

  return (
    <button onClick={() => setTheme('dark')}>
      Current: {actualTheme}
    </button>
  );
}
```

### `<LocaleProvider>`
**Location**: `components/providers/LocaleProvider.tsx`

i18n provider for translations.

```tsx
import LocaleProvider from '@/components/providers/LocaleProvider';

<LocaleProvider locale="en" messages={messages}>
  {children}
</LocaleProvider>
```

### `<NotificationProvider>`
**Location**: `components/providers/NotificationProvider.tsx`

Real-time notification system.

```tsx
<NotificationProvider>
  {children}
</NotificationProvider>
```

---

## 🛠 Common Utilities

### `<ErrorBoundary>`
**Location**: `components/common/ErrorBoundary.tsx`

Catches React errors and displays fallback UI.

```tsx
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

### `<Spinner>`
**Location**: `components/common/Spinner.tsx`

Loading spinner.

```tsx
<Spinner />
```

### `<BlockingScreen>`
**Location**: `components/common/BlockingScreen.tsx`

Full-page loading overlay.

```tsx
<BlockingScreen message="Loading..." />
```

---

## 👤 User Components

### `<Avatar>`
**Location**: `components/user/Avatar.tsx`

User avatar with fallback initials.

```tsx
<Avatar
  src={user.avatar_url}
  name={user.full_name}
  size={40}
  className="ring-2 ring-primary"
/>
```

**Props**:
- `src: string | null` - Avatar URL
- `name: string` - User name (for initials fallback)
- `size?: number` - Size in pixels (default: 40)
- `className?: string` - Additional CSS classes

### `<UserTable>`
**Location**: `components/user/UserTable.tsx`

User management table for company.

```tsx
<UserTable companyId={companyId} currentUserId={user.id} />
```

---

## 🎨 UI Primitives

Located in `components/ui/` - Based on Radix UI with Tailwind styling.

### `<Button>`
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="md">
  Click me
</Button>
```

**Variants**: `default`, `destructive`, `outline`, `ghost`, `link`
**Sizes**: `sm`, `md`, `lg`

### `<Input>`
```tsx
import { Input } from '@/components/ui/input';

<Input type="text" placeholder="Enter value" />
```

### `<Label>`
```tsx
import { Label } from '@/components/ui/label';

<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```

### `<Card>`
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### `<Tabs>`
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

---

## 🔍 Finding Components

**By Feature**:
- Authentication? → `components/auth/`
- Company management? → `components/company/`
- Integration settings? → `components/company/integrations/`
- Logs? → `components/integration-logs/`
- Navigation? → `components/layout/`

**By Type**:
- Reusable form inputs? → `components/company/integrations/`
- Generic UI? → `components/ui/`
- Context providers? → `components/providers/`

**Naming Convention**:
- Components: PascalCase (`NotificationInput.tsx`)
- Hooks: camelCase with `use` prefix (`useAuth`)
- Utils: camelCase (`cachedApi.ts`)

---

## 📝 Component Checklist

When creating a new component:

- [ ] Place in correct domain folder
- [ ] Define TypeScript interface for props
- [ ] Add JSDoc comment explaining purpose
- [ ] Export from file (named export preferred)
- [ ] Use consistent naming (PascalCase)
- [ ] Follow established patterns
- [ ] Keep component focused (single responsibility)
- [ ] Extract logic into hooks if complex

**Example**:
```tsx
'use client';

import { useState } from 'react';

interface MyComponentProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Brief description of what this component does
 * and when it should be used.
 */
export function MyComponent({ value, onChange }: MyComponentProps) {
  // Implementation
}
```

---

For architectural details, see [ARCHITECTURE.md](./ARCHITECTURE.md)
For development guidelines, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
