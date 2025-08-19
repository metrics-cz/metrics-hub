-- Migration: Remove old value column from secrets table
-- Description: Since database is clean, remove the old plaintext value column
-- Date: 2025-01-05

BEGIN;

-- Remove the check constraint that allows both value and encrypted_value
ALTER TABLE public.secrets 
DROP CONSTRAINT IF EXISTS check_secrets_value_or_encrypted;

-- Drop the old value column (since database is clean)
ALTER TABLE public.secrets 
DROP COLUMN IF EXISTS value;

-- Drop legacy app_id column and its index (replaced with app_permissions array)
DROP INDEX IF EXISTS idx_secrets_app_id;
ALTER TABLE public.secrets 
DROP COLUMN IF EXISTS app_id;

-- Make encrypted_value NOT NULL since it's now the only value field
ALTER TABLE public.secrets 
ALTER COLUMN encrypted_value SET NOT NULL;

-- Add new constraint to ensure encrypted_value is not empty
ALTER TABLE public.secrets 
ADD CONSTRAINT check_encrypted_value_not_empty 
CHECK (length(encrypted_value) > 0);

-- Update the migration function since we no longer need transition logic
DROP FUNCTION IF EXISTS migrate_secret_to_encrypted;

-- Add comment to clarify the new structure
COMMENT ON TABLE public.secrets IS 'Encrypted secrets storage - all values are AES-256-GCM encrypted';
COMMENT ON COLUMN public.secrets.encrypted_value IS 'AES-256-GCM encrypted secret value with format: version:iv:authTag:encrypted (NOT NULL)';

-- Update RLS policies to be more specific for the new structure
DROP POLICY IF EXISTS "Users can manage their company's encrypted secrets" ON public.secrets;
DROP POLICY IF EXISTS "Service role can manage all secrets" ON public.secrets;

-- Recreate RLS policies with better names
CREATE POLICY "Company users can access their encrypted secrets"
ON public.secrets
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company users can insert their encrypted secrets"
ON public.secrets
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company users can update their encrypted secrets"
ON public.secrets
FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company users can delete their encrypted secrets"
ON public.secrets
FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid()
  )
);

-- Service role has full access for executor-server
CREATE POLICY "Service role full access to encrypted secrets"
ON public.secrets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;