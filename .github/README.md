# GitHub Actions Workflows

This directory contains automated workflows for CI/CD.

## 📋 Workflows

### 1. `supabase-migrations.yml` - Production Migrations
**Trigger:** Push to `main` branch (when migrations change)

**What it does:**
- Validates migration files for safety
- Applies pending migrations to production Supabase
- Runs health checks after migration

**Required Secrets:**
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`

### 2. `validate-migrations-pr.yml` - PR Validation
**Trigger:** Pull requests that modify migrations

**What it does:**
- Validates SQL syntax
- Checks for dangerous operations
- Detects duplicate timestamps
- Posts results as PR comment

**No secrets required** (read-only validation)

## 🚀 Setup

See [SUPABASE_CI_SETUP.md](../SUPABASE_CI_SETUP.md) for complete setup instructions.

Quick start:
1. Add required GitHub Secrets
2. Merge to main
3. Migrations apply automatically! ✨

## 🔧 Manual Trigger

You can manually trigger migrations:
1. Go to **Actions** tab
2. Select **"Supabase Migrations"** workflow
3. Click **"Run workflow"**
4. Select branch and click **"Run"**
