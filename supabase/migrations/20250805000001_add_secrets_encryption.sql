-- Migration: Add encrypted secrets support
-- Description: Updates secrets table to support encrypted storage with app permissions
-- Date: 2025-01-05

BEGIN;

-- Add new columns to secrets table
ALTER TABLE public.secrets 
ADD COLUMN IF NOT EXISTS encrypted_value TEXT,
ADD COLUMN IF NOT EXISTS key_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS app_permissions TEXT[] DEFAULT '{}';

-- Create index for app permissions array
CREATE INDEX IF NOT EXISTS idx_secrets_app_permissions ON public.secrets USING GIN (app_permissions);

-- Add performance index for key_version
CREATE INDEX IF NOT EXISTS idx_secrets_key_version ON public.secrets (key_version);

-- Update existing secrets to use new encrypted_value field
-- Note: This sets encrypted_value to current value temporarily
-- The application will re-encrypt these on next access
UPDATE public.secrets 
SET encrypted_value = value 
WHERE encrypted_value IS NULL AND value IS NOT NULL;

-- Add check constraint to ensure either value or encrypted_value exists
ALTER TABLE public.secrets 
ADD CONSTRAINT check_secrets_value_or_encrypted 
CHECK (
  (value IS NOT NULL AND encrypted_value IS NULL) OR 
  (value IS NULL AND encrypted_value IS NOT NULL) OR
  (value IS NOT NULL AND encrypted_value IS NOT NULL)
);

-- Create function to migrate plaintext secrets to encrypted format
-- This will be called by the application during the transition period
CREATE OR REPLACE FUNCTION migrate_secret_to_encrypted(
  secret_id UUID,
  new_encrypted_value TEXT,
  new_key_version INTEGER DEFAULT 1
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.secrets 
  SET 
    encrypted_value = new_encrypted_value,
    key_version = new_key_version,
    value = NULL,  -- Clear plaintext value
    updated_at = NOW()
  WHERE id = secret_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION migrate_secret_to_encrypted TO service_role;

-- Add RLS policy for encrypted secrets
CREATE POLICY "Users can manage their company's encrypted secrets"
ON public.secrets
FOR ALL
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

-- Service role policy for secrets management
CREATE POLICY "Service role can manage all secrets"
ON public.secrets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON COLUMN public.secrets.encrypted_value IS 'AES-256-GCM encrypted secret value with format: version:iv:authTag:encrypted';
COMMENT ON COLUMN public.secrets.key_version IS 'Encryption key version for key rotation support';
COMMENT ON COLUMN public.secrets.app_permissions IS 'Array of application IDs that can access this secret';

-- Create audit trigger for secrets access
CREATE OR REPLACE FUNCTION audit_secrets_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log secret access attempts
  INSERT INTO public.audit_logs (
    table_name,
    operation,
    old_data,
    new_data,
    user_id,
    timestamp,
    metadata
  ) VALUES (
    'secrets',
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    NOW(),
    jsonb_build_object(
      'company_id', COALESCE(NEW.company_id, OLD.company_id),
      'secret_key', COALESCE(NEW.key, OLD.key),
      'app_permissions', COALESCE(NEW.app_permissions, OLD.app_permissions)
    )
  );
  
  -- Update last_used_at on SELECT (if supported by trigger)
  IF TG_OP = 'UPDATE' AND NEW.last_used_at IS DISTINCT FROM OLD.last_used_at THEN
    NEW.last_used_at = NOW();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit trigger
CREATE TRIGGER secrets_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.secrets
  FOR EACH ROW
  EXECUTE FUNCTION audit_secrets_access();

COMMIT;