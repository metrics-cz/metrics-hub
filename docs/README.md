# Metrics Hub

> Modern dashboard for managing company integrations, monitoring metrics, and tracking automation executions.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.0-green)](https://supabase.com/)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm
- PostgreSQL (via Supabase)

### Installation

```bash
# Clone the repository
git clone https://github.com/metrics-cz/metrics-hub.git
cd metrics-hub-supabase

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 Documentation

- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Complete guide for developers
- **[Architecture](./ARCHITECTURE.md)** - System architecture and design
- **[Component Reference](./COMPONENT_REFERENCE.md)** - Component API documentation
- **[Project Context](./CLAUDE.md)** - Project-specific instructions

---

## ✨ Features

### 🏢 Multi-Company Management
- Switch between multiple companies seamlessly
- Role-based access control (Owner, Admin, Member)
- Company-specific branding and settings

### 🔌 Integration Marketplace
- Browse and install integrations
- OAuth support (Google Ads, Analytics, etc.)
- Custom plugin system with iframe execution

### 📊 Real-Time Monitoring
- Live integration logs with advanced filtering
- Performance metrics tracking
- Success/error rate dashboards
- Anomaly detection alerts

### 🔐 Security First
- Row-level security (RLS)
- Encrypted OAuth token storage
- Company data isolation
- Role-based permissions

### 🌍 Internationalization
- English and Czech languages
- Easy to add more locales
- Automatic locale detection

### 🎨 Modern UI
- Dark/light theme support
- Responsive design (mobile-first)
- Smooth animations
- Accessible components

---

## 🏗 Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Components**: Radix UI
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

### Backend
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **API**: Next.js API Routes
- **Encryption**: Node.js Crypto

### DevOps
- **Hosting**: Vercel / Railway
- **Database Hosting**: Supabase Cloud
- **CI/CD**: GitHub Actions (optional)

---

## 📁 Project Structure

```
metrics-hub-supabase/
├── src/
│   ├── app/                    # Next.js pages & API routes
│   │   ├── [locale]/          # Internationalized routes
│   │   │   ├── (dashboard)/   # Protected dashboard
│   │   │   └── auth/          # Authentication pages
│   │   └── api/               # API endpoints
│   │
│   ├── components/            # React components (domain-organized)
│   │   ├── auth/             # Authentication
│   │   ├── common/           # Shared utilities
│   │   ├── company/          # Company management
│   │   │   └── integrations/ # Integration settings
│   │   ├── integration-logs/ # Log viewing
│   │   ├── layout/          # Navigation
│   │   ├── providers/       # React contexts
│   │   ├── ui/              # UI primitives
│   │   └── user/            # User management
│   │
│   ├── lib/                  # Core utilities
│   │   ├── auth.ts          # Authentication helpers
│   │   ├── cachedApi.ts     # API client with caching
│   │   ├── encryption.ts    # Token encryption
│   │   ├── permissions.ts   # Access control
│   │   └── prisma.ts        # Database client
│   │
│   └── locales/             # i18n translations
│
├── prisma/                   # Database schema
├── supabase/                # Supabase config & migrations
├── public/                  # Static assets
└── scripts/                 # Utility scripts
```

**Key Principle**: Components are organized by **business domain**, not technical type.

---

## 🎯 Core Concepts

### Domain-Based Organization

Instead of grouping by type (buttons, forms, etc.), we group by business domain:

```
✅ Good (Domain-based)
components/company/integrations/NotificationInput.tsx

❌ Bad (Type-based)
components/forms/inputs/notification/NotificationInput.tsx
```

**Benefits**:
- Find related features quickly
- Clear boundaries between domains
- Easier for new developers to navigate
- Natural feature grouping

### Component Reusability

We extract repetitive patterns into reusable components:

```tsx
// Instead of 4 duplicate notification inputs, use:
<NotificationInput type="email" ... />
<NotificationInput type="slack" ... />
<NotificationInput type="discord" ... />
<NotificationInput type="whatsapp" ... />
```

### Consistent API Patterns

All API routes follow the same structure:
1. ✅ Authenticate request
2. ✅ Check permissions
3. ✅ Execute business logic
4. ✅ Return standardized response

---

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (port 3000)

# Building
npm run build           # Production build
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npx tsc --noEmit        # Type check

# Database
npx prisma migrate dev  # Create and apply migration
npx prisma studio       # Open database GUI
npx prisma generate     # Generate Prisma client

# Supabase
npx supabase start      # Start local Supabase
npx supabase status     # Check status
npx supabase db reset   # Reset local database
```

### Environment Variables

Create `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=your_database_url

# Encryption
MASTER_ENCRYPTION_KEY=your_master_key_64_hex_chars
ENCRYPTION_KEY=your_encryption_key
KEY_VERSION=1

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Email (optional)
RESEND_API_KEY=your_resend_key
```

### Testing Locally

After making changes:

1. **Type check**: `npx tsc --noEmit`
2. **Build test**: `npm run build`
3. **Run locally**: `npm run dev`
4. **Test in browser**: Check integrations, settings, logs

**Important**: Always test integrations end-to-end before committing (see CLAUDE.md).

---

## 🔐 Authentication Flow

```
1. User visits app
   ↓
2. Redirect to /auth
   ↓
3. Login with Supabase Auth
   - Email/Password
   - OAuth (Google, etc.)
   ↓
4. JWT token stored in httpOnly cookie
   ↓
5. Access protected routes
   ↓
6. API routes verify token
   ↓
7. Check company permissions
   ↓
8. Return data
```

---

## 🏢 Multi-Tenancy

### Company Isolation

Every resource is scoped to a company:

```typescript
// Database queries always include company_id
const apps = await prisma.company_applications.findMany({
  where: { company_id: companyId }
});

// API routes check permissions
const permission = await checkCompanyPermission(userId, companyId);
```

### User Roles

- **Owner**: Full control, can delete company
- **Admin**: Manage users, settings, integrations
- **Member**: View data, limited modifications

---

## 🔌 Plugin System

### How Plugins Work

1. **Install**: User installs plugin from marketplace
2. **Configure**: Set up OAuth, settings, schedules
3. **Execute**: Executor service runs plugin in Docker
4. **Results**: Data saved to integration_logs table
5. **Monitor**: View logs and metrics in dashboard

### Creating a Plugin

```bash
# Use the plugin generator
npm run create-plugin

# Follow prompts for:
# - Plugin name
# - Template (data-fetcher, automation, dashboard)
# - Category
# - Permissions
```

See full plugin development guide in `docs/plugin-development/`

---

## 📊 Database Schema

### Core Tables

- `companies` - Company information
- `company_users` - User-company relationships with roles
- `applications` - Available integrations (marketplace)
- `company_applications` - Installed integrations
- `integration_logs` - Execution logs and results
- `secrets` - Encrypted OAuth tokens
- `notifications` - User notifications

### Migrations

```bash
# Create new migration
npx prisma migrate dev --name add_new_feature

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (local only!)
npx prisma migrate reset
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. Connect GitHub repository
2. Configure environment variables
3. Deploy automatically on push

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Manual

```bash
# Build
npm run build

# Start
npm start
```

**Don't forget**: Run migrations on production database!

---

## 🤝 Contributing

### Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style

- Follow TypeScript best practices
- Use ESLint configuration
- Write descriptive commit messages
- Add JSDoc comments for complex functions
- Keep components under 500 lines

### Before Submitting PR

- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Tested locally with real data
- [ ] Updated documentation if needed

---

## 📚 Learn More

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Project Docs
- [Developer Guide](./DEVELOPER_GUIDE.md) - Complete development guide
- [Architecture](./ARCHITECTURE.md) - System architecture
- [Component Reference](./COMPONENT_REFERENCE.md) - Component API

---

## 🐛 Troubleshooting

### Common Issues

**Build fails with TypeScript errors**
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
```

**Database connection issues**
```bash
# Check Supabase status
npx supabase status

# Restart local Supabase
npx supabase stop
npx supabase start
```

**Environment variables not loading**
- Ensure `.env.local` exists
- Restart dev server after changing env vars
- Check variable names match exactly

**OAuth not working**
- Verify redirect URLs in Google Console
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Ensure callback URL is correct

---

## 📄 License

This project is proprietary and confidential.

---

## 👥 Team

Developed by **Metrics.cz**

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database powered by [Supabase](https://supabase.com/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

---

**Made with ❤️ by the Metrics Hub team**
