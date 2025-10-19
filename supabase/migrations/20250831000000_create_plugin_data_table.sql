-- Create plugin_data table for iframe plugins to store key-value data
CREATE TABLE IF NOT EXISTS plugin_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_application_id UUID NOT NULL REFERENCES company_applications(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Ensure unique key per company application
    UNIQUE(company_application_id, key)
);

-- Enable RLS on plugin_data
ALTER TABLE plugin_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access data for their company's applications
CREATE POLICY "plugin_data_company_access" ON plugin_data
    FOR ALL TO authenticated
    USING (
        company_application_id IN (
            SELECT ca.id 
            FROM company_applications ca
            INNER JOIN company_users cu ON ca.company_id = cu.company_id
            WHERE cu.user_id = auth.uid()
        )
    )
    WITH CHECK (
        company_application_id IN (
            SELECT ca.id 
            FROM company_applications ca
            INNER JOIN company_users cu ON ca.company_id = cu.company_id
            WHERE cu.user_id = auth.uid()
        )
    );

-- Service role can manage all plugin data
CREATE POLICY "service_role_manage_plugin_data" ON plugin_data
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plugin_data_company_application_id ON plugin_data(company_application_id);
CREATE INDEX IF NOT EXISTS idx_plugin_data_key ON plugin_data(key);
CREATE INDEX IF NOT EXISTS idx_plugin_data_updated_at ON plugin_data(updated_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_plugin_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plugin_data_update_updated_at
    BEFORE UPDATE ON plugin_data
    FOR EACH ROW
    EXECUTE FUNCTION update_plugin_data_updated_at();