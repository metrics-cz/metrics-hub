-- Thorough cleanup of remaining executor items
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Starting thorough executor cleanup...';
  
  -- Drop all triggers with 'executor' in name
  FOR rec IN 
    SELECT nspname as schema, relname as table, tgname as trigger 
    FROM pg_trigger 
    JOIN pg_class ON tgrelid = pg_class.oid 
    JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
    WHERE NOT tgisinternal 
      AND (tgname ILIKE '%executor%' OR tgname ILIKE '%company_application_executor%')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', rec.trigger, rec.schema, rec.table);
    RAISE NOTICE 'Dropped trigger: %.%.%', rec.schema, rec.table, rec.trigger;
  END LOOP;
  
  -- Drop all functions with 'executor' in name (except legitimate ones)
  FOR rec IN 
    SELECT proname, oidvectortypes(proargtypes) as args
    FROM pg_proc 
    WHERE proname ILIKE '%executor%' 
      AND proname NOT IN ('get_executor_server_info')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I(%s)', rec.proname, rec.args);
    RAISE NOTICE 'Dropped function: %(%)', rec.proname, rec.args;
  END LOOP;
  
  RAISE NOTICE 'Thorough cleanup completed.';
END $$;