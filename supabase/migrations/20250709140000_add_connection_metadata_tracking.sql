-- Add connection metadata tracking to company_integrations table
ALTER TABLE company_integrations 
ADD COLUMN IF NOT EXISTS connected_by_user_id UUID,
ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add foreign key constraint for connected_by_user_id
ALTER TABLE company_integrations
ADD CONSTRAINT fk_connected_by_user
FOREIGN KEY (connected_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_integrations_updated_at_trigger
    BEFORE UPDATE ON company_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_company_integrations_updated_at();

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_company_integrations_connected_by ON company_integrations(connected_by_user_id);
CREATE INDEX IF NOT EXISTS idx_company_integrations_connected_at ON company_integrations(connected_at);
CREATE INDEX IF NOT EXISTS idx_company_integrations_last_sync ON company_integrations(last_sync);
CREATE INDEX IF NOT EXISTS idx_company_integrations_sync_status ON company_integrations(sync_status);

-- Add check constraint for sync_status
ALTER TABLE company_integrations
ADD CONSTRAINT chk_sync_status 
CHECK (sync_status IN ('pending', 'syncing', 'success', 'error'));

-- Update existing records to have connected_at timestamp
UPDATE company_integrations 
SET connected_at = created_at 
WHERE connected_at IS NULL AND created_at IS NOT NULL;

-- Add comment to explain the new fields
COMMENT ON COLUMN company_integrations.connected_by_user_id IS 'ID of the user who connected this integration';
COMMENT ON COLUMN company_integrations.connected_at IS 'Timestamp when the integration was first connected';
COMMENT ON COLUMN company_integrations.last_sync IS 'Timestamp of the last successful sync';
COMMENT ON COLUMN company_integrations.sync_status IS 'Current sync status: pending, syncing, success, error';
COMMENT ON COLUMN company_integrations.error_message IS 'Error message if sync failed';