-- Safe cleanup for already dropped columns
-- Migration: 20250821120000_cleanup_dropped_columns_safe.sql

BEGIN;

-- This migration handles the case where columns were already dropped manually
-- It only attempts to drop columns if they still exist

DO $$
BEGIN
    -- Drop app_type column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'app_type'
    ) THEN
        ALTER TABLE applications DROP COLUMN app_type;
        RAISE NOTICE 'Dropped app_type column';
    ELSE
        RAISE NOTICE 'app_type column already dropped';
    END IF;

    -- Drop has_frontend column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'has_frontend'
    ) THEN
        ALTER TABLE applications DROP COLUMN has_frontend;
        RAISE NOTICE 'Dropped has_frontend column';
    ELSE
        RAISE NOTICE 'has_frontend column already dropped';
    END IF;

    -- Drop has_backend column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'has_backend'
    ) THEN
        ALTER TABLE applications DROP COLUMN has_backend;
        RAISE NOTICE 'Dropped has_backend column';
    ELSE
        RAISE NOTICE 'has_backend column already dropped';
    END IF;

    -- Drop cron_schedule column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'cron_schedule'
    ) THEN
        ALTER TABLE applications DROP COLUMN cron_schedule;
        RAISE NOTICE 'Dropped cron_schedule column';
    ELSE
        RAISE NOTICE 'cron_schedule column already dropped';
    END IF;

    -- Drop pricing_model_executor column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'pricing_model_executor'
    ) THEN
        ALTER TABLE applications DROP COLUMN pricing_model_executor;
        RAISE NOTICE 'Dropped pricing_model_executor column';
    ELSE
        RAISE NOTICE 'pricing_model_executor column already dropped';
    END IF;

    -- Drop download_count column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'download_count'
    ) THEN
        ALTER TABLE applications DROP COLUMN download_count;
        RAISE NOTICE 'Dropped download_count column';
    ELSE
        RAISE NOTICE 'download_count column already dropped';
    END IF;

    -- Drop rating column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'rating'
    ) THEN
        ALTER TABLE applications DROP COLUMN rating;
        RAISE NOTICE 'Dropped rating column';
    ELSE
        RAISE NOTICE 'rating column already dropped';
    END IF;

    -- Drop health_check_url column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'health_check_url'
    ) THEN
        ALTER TABLE applications DROP COLUMN health_check_url;
        RAISE NOTICE 'Dropped health_check_url column';
    ELSE
        RAISE NOTICE 'health_check_url column already dropped';
    END IF;

    -- Drop webhook_url column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'webhook_url'
    ) THEN
        ALTER TABLE applications DROP COLUMN webhook_url;
        RAISE NOTICE 'Dropped webhook_url column';
    ELSE
        RAISE NOTICE 'webhook_url column already dropped';
    END IF;

END $$;

-- Clean up any remaining indexes safely
DROP INDEX IF EXISTS idx_applications_app_type;
DROP INDEX IF EXISTS idx_applications_has_frontend;
DROP INDEX IF EXISTS idx_applications_has_backend;
DROP INDEX IF EXISTS idx_applications_rating;

COMMIT;

-- Final status check
DO $$
DECLARE
    total_columns integer;
BEGIN
    -- Count current columns
    SELECT count(*)
    INTO total_columns
    FROM information_schema.columns 
    WHERE table_name = 'applications' AND table_schema = 'public';
    
    RAISE NOTICE '=== FINAL STATUS ===';
    RAISE NOTICE 'Applications table now has % columns', total_columns;
    RAISE NOTICE 'Schema cleanup complete';
    RAISE NOTICE '==================';
END $$;