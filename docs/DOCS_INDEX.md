# Documentation Index

Complete guide to all documentation in Metrics Hub.

---

## 📚 Documentation Overview

All documentation is organized by **audience** and **use case**:

### For New Developers

Start here if you're new to the project:

1. **[README.md](./README.md)** ⭐ Start here!
   - Project overview & quick start
   - Features and tech stack
   - Installation instructions
   - **Time to read:** 10 minutes

2. **[ONBOARDING.md](./ONBOARDING.md)** 👋 Your first week
   - Day-by-day onboarding plan
   - Setup instructions
   - First contributions
   - **Time to read:** 20 minutes

3. **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** 📖 Complete reference
   - Project structure explained
   - Common patterns
   - Code style guidelines
   - Adding new features
   - **Time to read:** 45 minutes

### For Understanding the System

4. **[ARCHITECTURE.md](./ARCHITECTURE.md)** 🏗️ System design
   - High-level architecture
   - Data flow diagrams
   - Component organization
   - Key subsystems
   - **Time to read:** 30 minutes

5. **[COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md)** 🧩 Component API
   - All components documented
   - Props and usage examples
   - Quick lookup reference
   - **Time to read:** 15 minutes (reference)

### Project-Specific

6. **[CLAUDE.md](./CLAUDE.md)** 🤖 AI Assistant context
   - Project-specific instructions
   - Testing requirements
   - Context for AI-assisted development
   - **Time to read:** 5 minutes

---

## 🎯 Reading Paths

### Path 1: "I want to contribute ASAP"

**Fastest path to first PR (90 minutes):**

1. [README.md](./README.md) - Quick start section only
2. [ONBOARDING.md](./ONBOARDING.md) - Day 1 section
3. Setup dev environment (30 min)
4. [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Component organization + Common patterns
5. Pick a "good first issue"

### Path 2: "I want to understand everything first"

**Comprehensive learning (3-4 hours):**

1. [README.md](./README.md) - Full document
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - Complete read
3. [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Complete read
4. [COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md) - Browse components
5. [ONBOARDING.md](./ONBOARDING.md) - Week 1-2 sections
6. Explore codebase with documentation as reference

### Path 3: "I need to find something specific"

**Quick lookups:**

- **"Where is component X?"** → [COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md)
- **"How do I add a feature?"** → [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#adding-new-features)
- **"What's the auth flow?"** → [ARCHITECTURE.md](./ARCHITECTURE.md#authentication--authorization)
- **"How to setup?"** → [README.md](./README.md#quick-start)
- **"Project structure?"** → [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#project-structure)

---

## 📋 Document Summary

### README.md
**Purpose:** Project homepage
**Audience:** Everyone
**Contains:**
- Quick start guide
- Features overview
- Tech stack
- Development commands
- Deployment guide
- Contributing guidelines

### ONBOARDING.md
**Purpose:** New developer onboarding
**Audience:** New team members
**Contains:**
- Day-by-day setup plan
- Codebase exploration guide
- First contribution ideas
- 30-day goals
- Getting help resources

### DEVELOPER_GUIDE.md
**Purpose:** Complete development reference
**Audience:** Active developers
**Contains:**
- Project structure (detailed)
- Component organization philosophy
- Common patterns & best practices
- Code style guidelines
- Adding features (step-by-step)
- Testing strategy

### ARCHITECTURE.md
**Purpose:** System design documentation
**Audience:** Developers, architects
**Contains:**
- High-level architecture diagrams
- Data flow explanations
- Key subsystems (auth, multi-tenancy, plugins)
- Database schema
- Performance & scalability
- Security considerations

### COMPONENT_REFERENCE.md
**Purpose:** Component API documentation
**Audience:** Developers writing UI
**Contains:**
- All components listed by domain
- Props and usage examples
- Component location guide
- Best practices
- When to use which component

### CLAUDE.md
**Purpose:** AI assistant instructions
**Audience:** Claude Code / developers using AI
**Contains:**
- Project-specific context
- Testing requirements
- Custom workflows

---

## 🔍 Finding Information

### By Topic

**Authentication:**
- Setup → [README.md](./README.md#authentication-flow)
- Implementation → [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#authentication)
- Architecture → [ARCHITECTURE.md](./ARCHITECTURE.md#1-authentication--authorization)
- Usage → [COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md#authprovider)

**Components:**
- Overview → [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#component-organization)
- Philosophy → [ARCHITECTURE.md](./ARCHITECTURE.md#component-architecture)
- Reference → [COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md)

**Database:**
- Setup → [README.md](./README.md#quick-start)
- Schema → [ARCHITECTURE.md](./ARCHITECTURE.md#database-schema)
- Migrations → [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#database)

**API Routes:**
- Patterns → [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#4-api-routes)
- Flow → [ARCHITECTURE.md](./ARCHITECTURE.md#2-api-request-flow)

**Integrations/Plugins:**
- Overview → [README.md](./README.md#plugin-system)
- Architecture → [ARCHITECTURE.md](./ARCHITECTURE.md#3-integration-system)
- Creating → [README.md](./README.md#creating-a-plugin)

### By Task

**"I need to..."**

- **...setup my dev environment**
  → [ONBOARDING.md](./ONBOARDING.md#step-1-setup-development-environment-10-min)

- **...understand the folder structure**
  → [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#project-structure)

- **...create a new component**
  → [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#creating-a-new-integration-component)

- **...add a new API endpoint**
  → [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#adding-a-new-api-endpoint)

- **...add a new page**
  → [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#adding-a-new-page)

- **...use an existing component**
  → [COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md) (find component by name)

- **...understand how auth works**
  → [ARCHITECTURE.md](./ARCHITECTURE.md#1-user-authentication-flow)

- **...deploy to production**
  → [README.md](./README.md#deployment)

---

## 📝 Documentation Philosophy

### Why We Document This Way

**Domain-based organization:**
- Mirrors code structure
- Easy to navigate
- Clear boundaries

**Multiple reading paths:**
- Quick start for speed
- Comprehensive for depth
- Reference for lookups

**Audience-focused:**
- Different needs, different docs
- Progressive disclosure
- Just-in-time information

### Keeping Docs Updated

**When to update docs:**
- ✅ Adding new major feature
- ✅ Changing architecture
- ✅ Adding reusable component
- ✅ Modifying folder structure
- ✅ Changing development workflow

**What doesn't need docs:**
- ❌ Small bug fixes
- ❌ Internal refactoring (no API change)
- ❌ CSS adjustments
- ❌ Copy changes

**How to update:**
1. Make code changes
2. Update relevant docs
3. Include in same PR
4. Mention in PR description

---

## 🎯 Quick Reference Card

**Print this or keep handy:**

```
┌─────────────────────────────────────────────────────────────┐
│                   METRICS HUB QUICK REF                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DOCS:                                                      │
│  • README.md            - Start here                        │
│  • ONBOARDING.md        - New developer guide               │
│  • DEVELOPER_GUIDE.md   - Complete reference                │
│  • ARCHITECTURE.md      - System design                     │
│  • COMPONENT_REF.md     - Component API                     │
│                                                             │
│  COMMANDS:                                                  │
│  • npm run dev          - Start dev server                  │
│  • npm run build        - Build for production              │
│  • npx tsc --noEmit     - Type check                        │
│  • npm run lint         - Lint check                        │
│  • npx prisma studio    - Database GUI                      │
│                                                             │
│  STRUCTURE:                                                 │
│  • src/app/             - Pages & API routes                │
│  • src/components/      - React components (by domain)      │
│  • src/lib/             - Utilities & services              │
│                                                             │
│  KEY PATTERNS:                                              │
│  • Domain-based organization                                │
│  • Auth → Permissions → Logic                               │
│  • Reusable components                                      │
│  • TypeScript everywhere                                    │
│                                                             │
│  HELP:                                                      │
│  • #metrics-hub-dev     - Slack channel                     │
│  • Team lead            - Schedule pairing                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Next Steps

1. **New to project?** → Start with [README.md](./README.md)
2. **Ready to code?** → Follow [ONBOARDING.md](./ONBOARDING.md)
3. **Building features?** → Use [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
4. **Need component?** → Check [COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md)
5. **Understanding system?** → Read [ARCHITECTURE.md](./ARCHITECTURE.md)

---

**Happy reading! 📚**
