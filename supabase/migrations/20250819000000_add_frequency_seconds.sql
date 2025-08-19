-- Migration: Replace frequency string field with frequency_seconds integer
-- Date: 2025-08-19
-- Description: Replace frequency string field with frequency_seconds integer for more flexible scheduling

-- Add the new frequency_seconds column
ALTER TABLE company_applications 
ADD COLUMN frequency_seconds INTEGER DEFAULT 86400;

-- Migrate existing frequency data to seconds
-- Default frequencies mapping:
-- '1h' -> 3600 seconds
-- '2h' -> 7200 seconds  
-- '4h' -> 14400 seconds
-- '6h' -> 21600 seconds
-- '8h' -> 28800 seconds
-- '12h' -> 43200 seconds
-- '24h'/'daily' -> 86400 seconds
-- 'weekly' -> 604800 seconds  
-- 'monthly' -> 2592000 seconds (30 days)

UPDATE company_applications 
SET frequency_seconds = CASE 
  WHEN frequency = '1h' THEN 3600
  WHEN frequency = '2h' THEN 7200
  WHEN frequency = '4h' THEN 14400
  WHEN frequency = '6h' THEN 21600
  WHEN frequency = '8h' THEN 28800
  WHEN frequency = '12h' THEN 43200
  WHEN frequency = '24h' OR frequency = 'daily' THEN 86400
  WHEN frequency = 'weekly' THEN 604800
  WHEN frequency = 'monthly' THEN 2592000
  ELSE 86400 -- Default to daily (24 hours)
END
WHERE frequency IS NOT NULL;

-- Remove the old frequency column
ALTER TABLE company_applications 
DROP COLUMN frequency;

-- Add comment to the new column
COMMENT ON COLUMN company_applications.frequency_seconds IS 'Integration execution frequency in seconds. Supports any positive integer from 1 second to 1 week (604800 seconds)';