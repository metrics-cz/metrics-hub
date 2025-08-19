-- Fix company_applications table structure for executor server
-- This migration adds missing columns to the existing company_applications table

BEGIN;

-- ============================================================================
-- STEP 1: Add missing columns to existing company_applications table
-- ============================================================================

-- Add executor-specific columns that are missing
ALTER TABLE public.company_applications 
ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS connected_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notification_channels jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS frequency text DEFAULT '24h',
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS next_run_at timestamptz,
ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
ADD COLUMN IF NOT EXISTS run_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error_message text,
ADD COLUMN IF NOT EXISTS price_per_month numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update status column to include new values if it has constraints
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%status%' 
        AND table_name = 'company_applications'
        AND constraint_type = 'CHECK'
    ) THEN
        ALTER TABLE public.company_applications 
        DROP CONSTRAINT IF EXISTS company_applications_status_check;
    END IF;
    
    -- Add new constraint with all required status values
    ALTER TABLE public.company_applications 
    ADD CONSTRAINT company_applications_status_check 
    CHECK (status IN ('active', 'inactive', 'error', 'pending', 'installing'));
END $$;

-- ============================================================================
-- STEP 2: Create missing indexes (now that columns exist)
-- ============================================================================

-- Company applications indexes
CREATE INDEX IF NOT EXISTS idx_company_applications_company_id ON public.company_applications(company_id);
CREATE INDEX IF NOT EXISTS idx_company_applications_application_id ON public.company_applications(application_id);
CREATE INDEX IF NOT EXISTS idx_company_applications_status ON public.company_applications(status);
CREATE INDEX IF NOT EXISTS idx_company_applications_enabled ON public.company_applications(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_company_applications_next_run ON public.company_applications(next_run_at) WHERE is_enabled = true AND next_run_at IS NOT NULL;

-- ============================================================================
-- STEP 3: Update existing records with sensible defaults
-- ============================================================================

-- Set sensible defaults for existing records
UPDATE public.company_applications 
SET 
    is_enabled = CASE WHEN status = 'active' THEN true ELSE false END,
    connected_at = COALESCE(connected_at, created_at),
    connected_by = COALESCE(connected_by, created_by),
    sync_status = CASE 
        WHEN status = 'active' THEN 'success'
        WHEN status = 'error' THEN 'error'
        ELSE 'pending'
    END,
    config = COALESCE(config, '{}'),
    notification_channels = COALESCE(notification_channels, '{}'),
    run_count = COALESCE(run_count, 0),
    success_count = COALESCE(success_count, 0),
    error_count = COALESCE(error_count, 0),
    price_per_month = COALESCE(price_per_month, 0)
WHERE 
    is_enabled IS NULL 
    OR connected_at IS NULL 
    OR sync_status IS NULL 
    OR config IS NULL 
    OR notification_channels IS NULL 
    OR run_count IS NULL 
    OR success_count IS NULL 
    OR error_count IS NULL 
    OR price_per_month IS NULL;

-- ============================================================================
-- STEP 4: Ensure RLS is enabled and policies exist
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.company_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'company_applications' 
        AND policyname = 'company_applications_company_access'
    ) THEN
        CREATE POLICY "company_applications_company_access" ON public.company_applications
            FOR ALL TO authenticated
            USING (
                company_id IN (
                    SELECT company_id 
                    FROM company_users 
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Add triggers for updated_at if they don't exist
-- ============================================================================

-- Add trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_company_applications_updated_at'
    ) THEN
        CREATE TRIGGER update_company_applications_updated_at 
            BEFORE UPDATE ON public.company_applications 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Grant permissions to service role
-- ============================================================================

-- Grant necessary permissions to service role for executor operations
GRANT ALL ON TABLE public.company_applications TO service_role;

COMMIT;

-- Log success (commented as it's outside transaction)
-- RAISE NOTICE 'Successfully updated company_applications table for executor server compatibility';