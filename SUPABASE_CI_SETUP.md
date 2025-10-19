# Supabase CI/CD Setup Guide

This guide will help you configure automatic database migrations for your Supabase project.

## 🎯 What This Does

- ✅ **Automatically applies migrations** when you push to `main`
- ✅ **Validates migrations** on pull requests
- ✅ **Prevents dangerous operations** with pre-flight checks
- ✅ **No more manual CLI work** - everything runs in GitHub Actions

## 📋 Prerequisites

1. A Supabase account with a production project
2. GitHub repository with this codebase
3. Admin access to both

## 🔧 Setup Instructions

### Step 1: Get Supabase Credentials

#### 1.1 Get your Access Token

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click your profile icon (top right)
3. Go to **"Access Tokens"**
4. Click **"Generate New Token"**
5. Give it a name like "GitHub Actions"
6. Copy the token (you won't see it again!)

#### 1.2 Get your Project ID

1. Go to your project in Supabase Dashboard
2. Click **Settings** → **General**
3. Find **"Reference ID"** - this is your project ID
4. It looks like: `abcdefghijklmnopqrst`

#### 1.3 Get your Database Password

1. Go to **Settings** → **Database**
2. Find your database password (you set this when creating the project)
3. If you forgot it, you can reset it here

### Step 2: Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** and add these three secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Your access token from Step 1.1 | Authenticates with Supabase API |
| `SUPABASE_PROJECT_ID` | Your project ID from Step 1.2 | Identifies your project |
| `SUPABASE_DB_PASSWORD` | Your database password from Step 1.3 | Connects to database |

### Step 3: (Optional) Configure Production Environment

For extra safety, you can require manual approval before migrations run:

1. Go to **Settings** → **Environments**
2. Click **"New environment"**
3. Name it `production`
4. Enable **"Required reviewers"** and add yourself
5. This will require approval before migrations run

### Step 4: Test the Setup

1. Create a test migration locally:
   ```bash
   supabase migration new test_cicd_setup
   ```

2. Add a simple SQL statement to the new migration file:
   ```sql
   -- Test migration for CI/CD
   SELECT 1;
   ```

3. Validate it locally:
   ```bash
   ./scripts/validate-migration.sh
   ```

4. Commit and push to a feature branch:
   ```bash
   git add supabase/migrations/
   git commit -m "Test: Add CI/CD test migration"
   git push origin feature/test-cicd
   ```

5. Create a Pull Request
   - You should see the validation workflow run
   - It will check your migration for issues

6. Merge to `main`
   - The migration workflow will run automatically
   - Your migration will be applied to production!

## 🚀 How It Works

### On Pull Requests
When you open a PR that changes migrations:
- ✅ Validates SQL syntax
- ✅ Checks for dangerous operations (DROP, TRUNCATE, etc.)
- ✅ Verifies naming conventions
- ✅ Checks for security issues (hardcoded secrets)
- ✅ Posts results as a PR comment

### On Merge to Main
When code is merged to `main`:
1. Validates migrations again
2. Links to your Supabase project
3. Applies all pending migrations
4. Verifies success
5. Reports status

## 🛠️ Local Development Workflow

### Creating New Migrations

```bash
# 1. Create a new migration
supabase migration new add_new_feature

# 2. Edit the migration file in supabase/migrations/

# 3. Test locally
supabase db reset  # Applies all migrations to local DB

# 4. Validate before committing
./scripts/validate-migration.sh

# 5. Commit and push
git add supabase/migrations/
git commit -m "Add migration for new feature"
git push
```

### Testing Migrations Locally

```bash
# Reset and apply all migrations
supabase db reset

# Apply only new migrations
supabase migration up

# Check migration status
supabase migration list
```

## 🔍 Validation Script

You can run validation locally anytime:

```bash
./scripts/validate-migration.sh
```

This checks for:
- ❌ Dangerous operations (DROP, TRUNCATE)
- ❌ Hardcoded secrets
- ❌ Syntax errors
- ⚠️ Missing idempotency (IF NOT EXISTS)
- ⚠️ Overly permissive RLS policies
- ⚠️ Naming convention issues

## 🚨 Troubleshooting

### "Migration failed" in GitHub Actions

**Check the workflow logs:**
1. Go to **Actions** tab in GitHub
2. Click on the failed workflow
3. Check the error message

**Common issues:**
- ❌ Wrong credentials → Check your GitHub Secrets
- ❌ SQL syntax error → Run locally first with `supabase db reset`
- ❌ Migration conflict → Someone else may have pushed a migration

**Fix it:**
```bash
# Pull latest changes
git pull origin main

# Reset your local DB
supabase db reset

# Fix any errors
# Then commit and push again
```

### "Cannot link to project"

**Check:**
- ✅ `SUPABASE_ACCESS_TOKEN` is correct
- ✅ `SUPABASE_PROJECT_ID` is correct (no extra spaces)
- ✅ Token has not expired

### Migration already applied

If a migration was applied manually, the workflow will skip it automatically. This is safe.

## 🔄 Rolling Back Migrations

If you need to rollback:

1. **Create a down migration:**
   ```bash
   supabase migration new rollback_feature_x
   ```

2. **Add the reverse SQL:**
   ```sql
   -- Reverse the changes from migration YYYYMMDDHHMMSS
   DROP TABLE IF EXISTS my_table;
   ```

3. **Commit and push** - it will apply automatically

**OR** revert the commit:
```bash
git revert <commit-hash>
git push
```

## 📊 Monitoring

After each deployment:
1. Check GitHub Actions logs for migration success
2. Verify in Supabase Dashboard → **Database** → **Migrations**
3. Test your app to ensure everything works

## 🔐 Security Best Practices

- ✅ **Never commit secrets** to migrations
- ✅ **Use environment variables** for sensitive data
- ✅ **Review migrations** before merging
- ✅ **Test locally** before pushing
- ✅ **Enable required reviewers** for production environment

## 📝 Tips

- Create small, focused migrations
- Use descriptive names: `add_user_roles_table` not `migration_1`
- Always test locally first
- Include rollback instructions in comments
- Use transactions for multi-step migrations

## 🆘 Need Help?

If migrations fail in production:
1. Check GitHub Actions logs
2. Check Supabase Dashboard logs
3. You can always run manually: `supabase db push --linked`
4. Contact your team if issues persist

---

**Next Steps:**
1. Complete the setup above
2. Create a test migration
3. Watch it deploy automatically! 🎉
