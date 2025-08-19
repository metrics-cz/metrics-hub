-- Migration: Add frequency_seconds field only (avoiding secrets table conflict)
-- Date: 2025-08-19
-- Description: Add frequency_seconds integer field to company_applications

-- Check if frequency_seconds column already exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_applications' 
        AND column_name = 'frequency_seconds'
    ) THEN
        -- Add the new frequency_seconds column
        ALTER TABLE company_applications 
        ADD COLUMN frequency_seconds INTEGER DEFAULT 86400;
        
        -- Migrate existing frequency data to seconds if frequency column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'company_applications' 
            AND column_name = 'frequency'
        ) THEN
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
        END IF;
        
        -- Add comment to the new column
        COMMENT ON COLUMN company_applications.frequency_seconds IS 'Integration execution frequency in seconds. Supports any positive integer from 1 second to 1 week (604800 seconds)';
    END IF;
END $$;