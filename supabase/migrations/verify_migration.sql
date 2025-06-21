-- Verification script
-- Run this on both dev and prod to compare

-- Check table counts
SELECT 
  schemaname,
  COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname IN ('public', 'auth')
GROUP BY schemaname;

-- Check RLS policies count
SELECT 
  schemaname,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname;

-- Check functions count
SELECT 
  schemaname,
  COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_schema = 'public'
GROUP BY schemaname;

-- Check row counts for main tables
SELECT 
  schemaname,
  tablename,
  n_tup_ins as estimated_rows
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_tup_ins DESC;

