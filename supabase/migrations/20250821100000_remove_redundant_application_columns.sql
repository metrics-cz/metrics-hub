-- Remove redundant and unused columns from applications table
-- Migration: 20250821100000_remove_redundant_application_columns.sql

BEGIN;

-- Remove redundant app_type column (we already have 'type')
ALTER TABLE applications DROP COLUMN IF EXISTS app_type;

-- Remove has_frontend and has_backend (redundant with execution_type)
ALTER TABLE applications DROP COLUMN IF EXISTS has_frontend;
ALTER TABLE applications DROP COLUMN IF EXISTS has_backend;

-- Remove cron_schedule (moved to BullMQ scheduling)
ALTER TABLE applications DROP COLUMN IF EXISTS cron_schedule;

-- Remove pricing_model_executor (unclear purpose, seems unused)
ALTER TABLE applications DROP COLUMN IF EXISTS pricing_model_executor;

COMMIT;