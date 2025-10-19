-- MetricsHub SDK Database Functions
-- Functions to support dynamic schema and table creation for applications

-- Function to create application schema
CREATE OR REPLACE FUNCTION create_app_schema(schema_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate schema name format for security
    IF schema_name !~ '^app_[a-zA-Z0-9_]+_company_[a-zA-Z0-9_]+$' THEN
        RAISE EXCEPTION 'Invalid schema name format: %', schema_name;
    END IF;
    
    -- Create schema if it doesn't exist
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    
    -- Log schema creation
    RAISE NOTICE 'Created schema: %', schema_name;
END;
$$;

-- Function to execute DDL statements safely
CREATE OR REPLACE FUNCTION execute_ddl(ddl_statement TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    clean_ddl TEXT;
BEGIN
    -- Basic security: only allow CREATE TABLE and related statements
    clean_ddl := trim(ddl_statement);
    
    -- Check if statement starts with allowed commands
    IF clean_ddl !~* '^(CREATE TABLE|CREATE INDEX|CREATE TRIGGER|CREATE OR REPLACE FUNCTION|DROP TRIGGER|ALTER TABLE)' THEN
        RAISE EXCEPTION 'DDL statement not allowed: %', left(clean_ddl, 50);
    END IF;
    
    -- Block dangerous statements
    IF clean_ddl ~* '(DROP SCHEMA|DROP DATABASE|TRUNCATE|DELETE FROM|UPDATE SET)' THEN
        RAISE EXCEPTION 'Dangerous DDL statement blocked: %', left(clean_ddl, 50);
    END IF;
    
    -- Execute the DDL
    EXECUTE ddl_statement;
    
    -- Log DDL execution
    RAISE NOTICE 'Executed DDL: %', left(clean_ddl, 100);
END;
$$;

-- Function to check if table exists
CREATE OR REPLACE FUNCTION table_exists(schema_name TEXT, table_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = schema_name 
        AND table_name = table_name
    );
END;
$$;

-- Function to safely drop development schemas (for cleanup)
CREATE OR REPLACE FUNCTION cleanup_dev_schemas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    schema_record RECORD;
    dropped_count INTEGER := 0;
BEGIN
    -- Only drop schemas that match the dev pattern and are older than 24 hours
    FOR schema_record IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name ~ '^app_.+_company_.+$'
        AND schema_name IN (
            -- This would need a tracking table in a real implementation
            -- For now, we'll be conservative and not auto-drop
            SELECT NULL WHERE FALSE
        )
    LOOP
        EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_record.schema_name);
        dropped_count := dropped_count + 1;
        RAISE NOTICE 'Dropped development schema: %', schema_record.schema_name;
    END LOOP;
    
    RETURN dropped_count;
END;
$$;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION create_app_schema(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION execute_ddl(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION table_exists(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_dev_schemas() TO service_role;

-- Create a tracking table for development schemas (for cleanup purposes)
CREATE TABLE IF NOT EXISTS app_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_name TEXT NOT NULL UNIQUE,
    app_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'development' CHECK (mode IN ('development', 'production')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on app_schemas
ALTER TABLE app_schemas ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see schemas for their companies
CREATE POLICY "app_schemas_company_access" ON app_schemas
    FOR ALL TO authenticated
    USING (
        company_id IN (
            SELECT company_id::text 
            FROM company_users 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id::text 
            FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

-- Service role can manage all schemas
CREATE POLICY "service_role_manage_app_schemas" ON app_schemas
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_schemas_company_id ON app_schemas(company_id);
CREATE INDEX IF NOT EXISTS idx_app_schemas_app_id ON app_schemas(app_id);
CREATE INDEX IF NOT EXISTS idx_app_schemas_mode ON app_schemas(mode);
CREATE INDEX IF NOT EXISTS idx_app_schemas_created_at ON app_schemas(created_at);

-- Function to register a schema (called when creating schemas)
CREATE OR REPLACE FUNCTION register_app_schema(
    schema_name TEXT,
    app_id TEXT,
    company_id TEXT,
    mode TEXT DEFAULT 'development'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO app_schemas (schema_name, app_id, company_id, mode, created_by)
    VALUES (schema_name, app_id, company_id, mode, auth.uid())
    ON CONFLICT (schema_name) 
    DO UPDATE SET last_accessed = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION register_app_schema(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Update the create_app_schema function to register the schema
CREATE OR REPLACE FUNCTION create_app_schema(
    schema_name TEXT,
    app_id TEXT DEFAULT NULL,
    company_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate schema name format for security
    IF schema_name !~ '^app_[a-zA-Z0-9_]+_company_[a-zA-Z0-9_]+$' THEN
        RAISE EXCEPTION 'Invalid schema name format: %', schema_name;
    END IF;
    
    -- Create schema if it doesn't exist
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    
    -- Register schema if app_id and company_id provided
    IF app_id IS NOT NULL AND company_id IS NOT NULL THEN
        PERFORM register_app_schema(schema_name, app_id, company_id, 'development');
    END IF;
    
    -- Log schema creation
    RAISE NOTICE 'Created schema: %', schema_name;
END;
$$;