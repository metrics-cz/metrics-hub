-- Final verification of executor cleanup
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
  hook_count INTEGER;
BEGIN
  -- Count remaining executor triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger 
  JOIN pg_class ON tgrelid = pg_class.oid 
  JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
  WHERE NOT tgisinternal 
    AND (tgname ILIKE '%executor%' OR tgname ILIKE '%company_application_executor%');

  -- Count remaining executor functions (excluding legitimate ones)
  SELECT COUNT(*) INTO function_count
  FROM pg_proc 
  WHERE proname ILIKE '%executor%' 
    AND proname NOT IN ('get_executor_server_info');

  -- Count remaining executor hooks
  SELECT COUNT(*) INTO hook_count
  FROM supabase_functions.hooks 
  WHERE hook_name ILIKE '%executor%';

  RAISE NOTICE '=== FINAL CLEANUP VERIFICATION ===';
  RAISE NOTICE 'Executor triggers remaining: %', trigger_count;
  RAISE NOTICE 'Executor functions remaining: %', function_count;
  RAISE NOTICE 'Executor hooks remaining: %', hook_count;
  
  IF trigger_count = 0 AND function_count = 0 AND hook_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All executor server webhooks completely removed!';
    RAISE NOTICE 'Remote database is clean and ready for Supabase Dashboard webhooks.';
  ELSE
    RAISE NOTICE '❌ WARNING: Some executor items still remain';
  END IF;
  RAISE NOTICE '================================';
END $$;