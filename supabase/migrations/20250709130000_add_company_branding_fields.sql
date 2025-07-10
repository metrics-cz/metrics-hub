-- Add branding fields to companies table
ALTER TABLE companies 
ADD COLUMN square_logo_url TEXT,
ADD COLUMN rectangular_logo_url TEXT,
ADD COLUMN primary_color VARCHAR(7) DEFAULT '#3B82F6',
ADD COLUMN secondary_color VARCHAR(7) DEFAULT '#1F2937',
ADD COLUMN contact_details JSONB DEFAULT '{}',
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at_trigger
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_companies_updated_at();

-- Add comment to explain contact_details structure
COMMENT ON COLUMN companies.contact_details IS 'JSON object containing contact information: {"email": "...", "phone": "...", "address": {...}, "website": "..."}';

-- Create index for efficient querying
CREATE INDEX idx_companies_updated_at ON companies(updated_at);
CREATE INDEX idx_companies_contact_details ON companies USING GIN(contact_details);