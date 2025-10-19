-- Add minimal iframe support to applications table
-- Only the essential fields needed for iframe plugins

ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS execution_type TEXT DEFAULT 'server' CHECK (execution_type IN ('iframe', 'server')),
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_applications_execution_type ON public.applications (execution_type);

-- Set default storage paths for existing applications
UPDATE public.applications 
SET storage_path = 'apps/' || id::text || '/'
WHERE storage_path IS NULL;

-- Auto-set storage_path for new applications
CREATE OR REPLACE FUNCTION set_storage_path()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.storage_path IS NULL THEN
        NEW.storage_path = 'apps/' || NEW.id::text || '/';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_storage_path_trigger
    BEFORE INSERT ON public.applications
    FOR EACH ROW EXECUTE FUNCTION set_storage_path();