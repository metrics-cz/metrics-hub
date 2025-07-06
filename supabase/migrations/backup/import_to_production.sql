-- Import script for production
-- Connection: postgresql://postgres.bdvrvltbahgsalmzvvjh:5rSSUJNRg6uu9MWO@aws-0-eu-central-1.pooler.supabase.com:5432/postgres

-- 1. Import complete schema (includes policies, roles, functions)
\i complete_schema.sql

-- 2. Import application data
\i app_data.sql

-- 3. Optional: Import auth data (uncomment if needed)
-- \i auth_data.sql

-- 4. Verify policies are applied
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

