# Metrics Hub - Architecture Overview

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Metrics Hub                          │
│                     (Next.js Frontend)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌────────────────┐
│   Supabase   │ │   Prisma    │ │ Plugin System  │
│  (Auth, DB)  │ │   (ORM)     │ │   (Iframe)     │
└──────────────┘ └─────────────┘ └────────────────┘
        │               │               │
        └───────────────┴───────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │   PostgreSQL    │
              │    Database     │
              └─────────────────┘
```

---

## Component Architecture

### Frontend Layer (Next.js App Router)

```
┌─────────────────────────────────────────────────┐
│                  App Router                     │
│  ┌──────────────────────────────────────────┐  │
│  │  Pages                                   │  │
│  │  - Landing (/)                           │  │
│  │  - Auth (/auth)                          │  │
│  │  - Dashboard (/[locale]/(dashboard))     │  │
│  │  - Company Settings                      │  │
│  │  - Integration Management                │  │
│  │  - Logs & Monitoring                     │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  API Routes                              │  │
│  │  - /api/companies/*                      │  │
│  │  - /api/plugins/*                        │  │
│  │  - /api/proxy/*                          │  │
│  │  - /api/integrations/*                   │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Component Organization

```
Domain-Based Structure
├── auth/              Authentication & authorization
├── company/           Company management
│   └── integrations/  Integration-specific UI
├── integration-logs/  Logging & monitoring
├── layout/           Navigation & chrome
├── providers/        Global state & context
├── ui/               Generic UI primitives
└── user/             User management
```

**Key Principle**: Components are grouped by **business domain**, not technical type.

---

## Data Flow

### 1. User Authentication Flow

```
User Login
    │
    ▼
┌─────────────────────┐
│  Supabase Auth      │
│  - Email/Password   │
│  - OAuth (Google)   │
└─────────┬───────────┘
          │
          ▼
    ┌──────────┐
    │  JWT     │
    │  Token   │
    └────┬─────┘
         │
         ▼
┌───────────────────┐
│  Session Cookie   │
│  - httpOnly       │
│  - secure         │
└─────────┬─────────┘
          │
          ▼
  ┌──────────────────┐
  │  AuthProvider    │
  │  (React Context) │
  └──────────────────┘
```

### 2. API Request Flow

```
Component
    │
    ▼
cachedApi.ts (Client-side caching)
    │
    ▼
/api/... (Next.js API Route)
    │
    ├─► authenticateRequest()  ─► Check JWT
    │
    ├─► checkCompanyPermission() ─► Verify access
    │
    └─► Business Logic
         │
         ▼
    ┌─────────────────┐
    │  Prisma Client  │
    └─────┬───────────┘
          │
          ▼
    ┌──────────────┐
    │  PostgreSQL  │
    └──────────────┘
```

### 3. Plugin Execution Flow

```
User Installs Plugin
    │
    ▼
Plugin Metadata → Database
    │
    ▼
Executor Server (separate service)
    │
    ├─► Pull plugin code from storage
    ├─► Spin up Docker container
    ├─► Run plugin with OAuth tokens
    └─► Send results to Database
         │
         ▼
    Integration Logs Table
         │
         ▼
    LogsViewer Component (real-time)
```

---

## Key Subsystems

### 1. Authentication & Authorization

**Technologies**: Supabase Auth, JWT, Row-Level Security

**Components**:
- `AuthProvider.tsx` - React context for auth state
- `auth.ts` - Authentication utilities
- `auth-middleware.ts` - Standardized auth checks
- `permissions.ts` - Role-based access control

**Roles**:
- `owner` - Full control, can delete company
- `admin` - Can manage users and settings
- `member` - Can view data, limited modifications

**Flow**:
```typescript
// 1. Client-side: Check auth state
const { user, loading } = useAuth();

// 2. Server-side: Verify request
const authResult = await authenticateRequest(request);

// 3. Check permissions
const permission = await checkCompanyPermission(userId, companyId, ['admin', 'owner']);
```

### 2. Multi-tenancy (Company Isolation)

**Pattern**: Row-Level Security + Application-Level Checks

Each resource is scoped to a company:
```sql
SELECT * FROM integrations WHERE company_id = $1
```

**Enforced at multiple levels**:
1. Database (RLS policies)
2. Prisma queries (explicit company_id filter)
3. API routes (checkCompanyPermission)

### 3. Integration System

**Components**:
- Plugin Marketplace (applications table)
- OAuth Token Management (encrypted storage)
- Proxy Endpoints (avoid CORS)
- Settings Management (JSON configuration)

**Plugin Types**:
- **Data Fetchers**: Pull data from external APIs
- **Automation**: Scheduled tasks (e.g., anomaly detection)
- **Dashboards**: Interactive visualizations

**OAuth Flow**:
```
1. User clicks "Connect Google"
   ↓
2. Redirect to /api/integrations/google/auth/[companyId]
   ↓
3. Google OAuth consent screen
   ↓
4. Callback to /api/integrations/google/callback
   ↓
5. Exchange code for tokens
   ↓
6. Encrypt tokens → Store in secrets table
   ↓
7. Plugin can now use tokens via proxy
```

### 4. Caching Strategy

**Client-Side**: `cachedApi.ts` + `requestCache.ts`

```typescript
// Cache with automatic invalidation
const data = await cachedApi.fetchCompanyApplications(companyId);

// Manual invalidation
cachedApi.invalidateCompanyApplications(companyId);
```

**Benefits**:
- Reduce redundant API calls
- Faster page transitions
- Consistent data across components
- Manual invalidation on mutations

### 5. Encryption & Security

**Encryption Service** (`encryption.ts`):
- Company-specific encryption keys (PBKDF2 derivation)
- AES-256-GCM encryption
- Encrypted storage for OAuth tokens

**Security Measures**:
```typescript
// 1. Derive company-specific key
const key = deriveCompanyKey(companyId);

// 2. Encrypt sensitive data
const encrypted = await encryptSecret(companyId, token);

// 3. Store encrypted value
await db.secrets.create({ encrypted_value: encrypted });
```

### 6. Logging & Monitoring

**Integration Logs System**:
- Centralized log collection
- Real-time log streaming
- Advanced filtering (level, source, category)
- Performance metrics (execution time, memory)

**Log Levels**:
- `debug` - Development information
- `info` - Normal operation
- `warn` - Potential issues
- `error` - Failures
- `fatal` - Critical failures

**Statistics Aggregation**:
- Single-pass reduce for performance
- Hourly timeline breakdown
- Source/category/integration grouping

---

## Database Schema

### Core Tables

**companies**
- Company information
- Logo, color scheme
- Active status

**company_users**
- Many-to-many relationship
- User roles (owner, admin, member)
- Permissions

**applications**
- Plugin metadata
- Category, version
- Installation status

**company_applications**
- Installed plugins per company
- Custom settings (JSON)
- OAuth credentials reference

**integration_logs**
- Execution logs
- Performance metrics
- Structured data (JSON)

**secrets**
- Encrypted OAuth tokens
- API keys
- Company-scoped

---

## Performance Optimizations

### 1. Request Caching
- Client-side cache with TTL
- Invalidation on mutations
- Reduces API calls by ~60%

### 2. Component Code Splitting
- Lazy loading for modals
- Route-based splitting (automatic)
- Reduces initial bundle size

### 3. Database Queries
- Prisma connection pooling
- Selective field fetching
- Indexed foreign keys

### 4. Static Generation
- Landing pages pre-rendered
- i18n routes statically generated
- Reduced server load

---

## Scalability Considerations

### Current Architecture
- **Single Region**: Deployed in one region
- **Vertical Scaling**: Scale up server resources
- **Connection Pooling**: Prisma handles DB connections

### Future Improvements
- **CDN**: Static assets via CDN
- **Read Replicas**: Separate read/write DBs
- **Microservices**: Extract executor to separate service
- **Message Queue**: For async plugin execution
- **Caching Layer**: Redis for hot data

---

## Development Workflow

### Local Development
```bash
# 1. Start database (Supabase local)
npx supabase start

# 2. Run migrations
npx prisma migrate dev

# 3. Start dev server
npm run dev
```

### Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database
DATABASE_URL=

# Encryption
MASTER_ENCRYPTION_KEY=
ENCRYPTION_KEY=
KEY_VERSION=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Deployment
1. Build: `npm run build`
2. Type check: `npx tsc --noEmit`
3. Deploy to Vercel/Railway
4. Run migrations: `npx prisma migrate deploy`

---

## Monitoring & Debugging

### Logging
```typescript
// Development
console.log('[MODULE]', data);

// Production (use structured logging)
console.error('[API-ERROR]', { context: 'fetchData', error });
```

### Error Tracking
- Client errors: React Error Boundaries
- API errors: Centralized error handler
- Database errors: Prisma error formatting

### Performance Monitoring
- Next.js built-in analytics
- Log execution times in integration_logs
- Track API response times

---

## Security Considerations

### Data Protection
- ✅ Row-Level Security (RLS)
- ✅ Encrypted OAuth tokens
- ✅ HttpOnly cookies
- ✅ CORS protection
- ✅ Input validation (Zod)

### Authentication
- ✅ JWT-based auth
- ✅ Refresh token rotation
- ✅ Session management
- ✅ OAuth 2.0 integration

### Authorization
- ✅ Role-based access control
- ✅ Company isolation
- ✅ Permission checks in API routes
- ✅ Client-side permission gates

---

## Glossary

- **Company**: Tenant/organization in multi-tenant system
- **Application**: Plugin/integration available in marketplace
- **Integration**: Installed application for a company
- **Executor**: Separate service that runs plugins
- **Plugin**: User-created integration with custom UI
- **OAuth Token**: Encrypted access credential
- **RLS**: Row-Level Security (database-level access control)

---

For implementation details, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
