# New Developer Onboarding

Welcome to Metrics Hub! This guide will get you up and running in 30 minutes.

---

## 🎯 Day 1: Get Running

### Step 1: Setup Development Environment (10 min)

**Install prerequisites:**
```bash
# Check versions
node --version   # Should be 20+
npm --version    # Should be 10+
git --version
```

**Clone and install:**
```bash
git clone https://github.com/metrics-cz/metrics-hub.git
cd metrics-hub-supabase
npm install
```

### Step 2: Configure Environment (5 min)

**Create `.env.local`:**
```bash
cp .env.example .env.local
```

**Get credentials from team:**
- Supabase URL and keys
- Database URL
- Encryption keys
- Google OAuth credentials (if testing OAuth)

**Ask your team lead for:**
- Access to Supabase dashboard
- Test account credentials
- Slack channel invites

### Step 3: Start Database (5 min)

```bash
# Option A: Use local Supabase
npx supabase start

# Option B: Connect to shared dev database
# (team lead will provide DATABASE_URL)
```

**Run migrations:**
```bash
npx prisma generate
npx prisma migrate dev
```

### Step 4: Start Development Server (2 min)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**✅ Success!** You should see the landing page.

### Step 5: Explore the App (8 min)

**Login with test account:**
- Email: (team will provide)
- Password: (team will provide)

**Try these features:**
1. Switch between companies
2. View integrations
3. Check logs viewer
4. Toggle dark mode
5. Switch language (English/Czech)

---

## 📚 Day 2-3: Understand the Codebase

### Read These Documents (Order matters!)

1. **[README.md](./README.md)** (15 min)
   - Project overview
   - Tech stack
   - Quick start

2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** (30 min)
   - System architecture
   - Data flow
   - Key subsystems

3. **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** (45 min)
   - Project structure
   - Common patterns
   - Code style guidelines

4. **[COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md)** (20 min)
   - Component locations
   - API reference
   - Usage examples

### Explore the Code

**Follow this path through the codebase:**

1. **Start with landing page:**
   - `src/app/[locale]/page.tsx` - Simple redirect logic
   - `src/components/auth/AuthProvider.tsx` - Auth context

2. **Then the dashboard:**
   - `src/app/[locale]/(dashboard)/layout.tsx` - Dashboard wrapper
   - `src/components/layout/Sidebar.tsx` - Navigation

3. **Try a feature page:**
   - `src/app/[locale]/(dashboard)/companies/[companyId]/integrations/page.tsx`
   - See how data is fetched with `cachedApi`

4. **Look at an API route:**
   - `src/app/api/companies/[companyId]/integrations/route.ts`
   - Notice auth → permissions → business logic pattern

5. **Explore reusable components:**
   - `src/components/company/integrations/NotificationInput.tsx`
   - See how we avoid duplication

### Key Files to Understand

**Authentication:**
- `src/lib/auth.ts` - Auth helpers
- `src/lib/permissions.ts` - Role checks

**API Client:**
- `src/lib/cachedApi.ts` - Cached API calls
- `src/lib/requestCache.ts` - Caching logic

**Database:**
- `src/lib/prisma.ts` - Database client
- `prisma/schema.prisma` - Database schema

**Utilities:**
- `src/lib/encryption.ts` - Token encryption
- `src/lib/supabaseClient.ts` - Supabase client

---

## 🛠 Week 1: First Contributions

### Easy First Tasks

**Pick one of these "good first issues":**

1. **Add a new translation string**
   - Edit `src/locales/en.json` and `src/locales/cz.json`
   - Use in a component with `useTranslations()`

2. **Create a simple UI component**
   - Add to appropriate domain folder
   - Follow existing patterns
   - Use TypeScript interfaces

3. **Add a new metric to monitoring**
   - Update integration settings
   - Display in logs viewer

4. **Improve error messages**
   - Find generic "Error" messages
   - Make them more descriptive

5. **Add a loading state**
   - Find a component that fetches data
   - Add proper loading UI

### Your First Pull Request

**Checklist before submitting:**

- [ ] Code follows style guide
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] No lint errors: `npm run lint`
- [ ] Tested locally (login → feature → logout)
- [ ] Commit message is clear
- [ ] PR description explains what and why

**PR Template:**
```markdown
## What
Brief description of changes

## Why
Why is this change needed?

## Testing
How to test this change:
1. Step 1
2. Step 2
3. Expected result

## Screenshots
(if UI changes)
```

---

## 💡 Tips & Tricks

### Development Shortcuts

**Fast component creation:**
```bash
# Copy an existing similar component
cp src/components/company/LogoUpload.tsx src/components/company/MyNewComponent.tsx
# Then modify for your needs
```

**Quick database reset:**
```bash
npx prisma migrate reset  # Local only!
npm run dev               # Restart server
```

**Find component usage:**
```bash
# Search for all uses of a component
grep -r "NotificationInput" src/
```

### Debugging Tips

**Console logging:**
```typescript
// Add context to logs
console.log('[MyComponent]', { data, state });

// Use different levels
console.error('[API-ERROR]', error);
console.warn('[DEPRECATED]', 'Use newFunc instead');
```

**React DevTools:**
- Install browser extension
- Inspect component props and state
- Track renders

**Network Tab:**
- Check API calls in browser DevTools
- Verify auth headers are sent
- Check response payloads

### Common Gotchas

**1. "Cannot find module '@/components/...'**
- Check file extension (.tsx not .ts for components)
- Verify import path matches actual file location
- Restart TypeScript server in VSCode

**2. "User not authenticated" errors**
- Clear cookies and login again
- Check .env.local has correct Supabase keys
- Verify token hasn't expired

**3. Changes not appearing**
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
- Clear Next.js cache: `rm -rf .next`
- Check file was saved

**4. TypeScript errors in IDE but builds fine**
- Restart TypeScript server
- Run `npx prisma generate` (regenerate types)
- Update VSCode TypeScript version

---

## 📖 Learning Resources

### Recommended Order

**Week 1-2: Core Technologies**
1. [Next.js App Router Tutorial](https://nextjs.org/learn) (4 hours)
2. [React Documentation](https://react.dev/learn) (6 hours)
3. [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) (4 hours)

**Week 3-4: Supporting Tools**
1. [Tailwind CSS Basics](https://tailwindcss.com/docs) (2 hours)
2. [Prisma Getting Started](https://www.prisma.io/docs/getting-started) (2 hours)
3. [Supabase Documentation](https://supabase.com/docs) (3 hours)

**Week 5+: Advanced Topics**
1. [React Hook Form](https://react-hook-form.com/get-started) (2 hours)
2. [Zod Validation](https://zod.dev/) (1 hour)
3. [Next-intl i18n](https://next-intl-docs.vercel.app/) (1 hour)

### Internal Resources

- **Team Wiki**: [link-here]
- **API Documentation**: [link-here]
- **Design System**: [link-here]
- **Slack Channels**:
  - #metrics-hub-dev - Development questions
  - #metrics-hub-general - General discussion

---

## 🎯 30-Day Goals

### Week 1: Foundation
- [ ] Development environment working
- [ ] Understand project structure
- [ ] Read all documentation
- [ ] Complete first small PR

### Week 2: Core Features
- [ ] Understand authentication flow
- [ ] Know how to add new component
- [ ] Familiar with API patterns
- [ ] Complete 2-3 PRs

### Week 3: Integration Work
- [ ] Understand plugin system
- [ ] Can add new integration
- [ ] Know OAuth flow
- [ ] Work on feature ticket

### Week 4: Independence
- [ ] Pick up tickets independently
- [ ] Review others' PRs
- [ ] Help new developers
- [ ] Suggest improvements

---

## 🤝 Getting Help

### When Stuck

**Try this order:**

1. **Search docs** (README, guides, component reference)
2. **Search codebase** (similar examples exist)
3. **Check Slack** (might be answered already)
4. **Ask team** (#metrics-hub-dev channel)
5. **Schedule pair programming** (great for complex issues)

### Good Questions vs Great Questions

**❌ Good but could be better:**
> "Why doesn't this work?"

**✅ Great question:**
> "I'm trying to add a notification input in the settings page. I imported `NotificationInput` from `@/components/company/integrations/NotificationInput` but getting a module not found error. I've checked:
> - File exists at that path ✓
> - Using .tsx extension ✓
> - Restarted dev server ✓
>
> What else should I check?"

**Include:**
- What you're trying to do
- What's happening
- What you've already tried
- Relevant code snippets
- Error messages (full text)

---

## 🎉 Congratulations!

You're now ready to contribute to Metrics Hub!

**Remember:**
- 🤔 Read the docs first
- 💬 Ask questions early
- 🧪 Test thoroughly
- 📝 Write clear commits
- 🤝 Help others

**Happy coding! 🚀**

---

**Next Steps:**
- Check JIRA/GitHub for "good first issue" tickets
- Join next standup meeting
- Introduce yourself in #metrics-hub-general
- Set up your IDE with recommended extensions

---

**Questions?** Reach out to your team lead or in #metrics-hub-dev!
