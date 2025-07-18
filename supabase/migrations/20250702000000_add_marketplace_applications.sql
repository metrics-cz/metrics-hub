-- Create marketplace applications database structure

-- Application categories table
CREATE TABLE IF NOT EXISTS "public"."application_categories" (
    "id" UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Applications catalog table
CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT NOT NULL,
    "long_description" TEXT,
    "category_id" UUID REFERENCES "public"."application_categories"("id") ON DELETE SET NULL,
    "category" TEXT NOT NULL, -- Keep for backwards compatibility
    "developer" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "icon_url" TEXT,
    "screenshots" TEXT[] DEFAULT '{}',
    "documentation_url" TEXT,
    "pricing_model" TEXT DEFAULT 'free' CHECK (pricing_model IN ('free', 'subscription', 'one_time')),
    "price" TEXT, -- Store as string for flexibility (e.g., "$29/month", "Free")
    "features" JSONB DEFAULT '[]',
    "tags" TEXT[] DEFAULT '{}',
    "rating" DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    "download_count" INTEGER DEFAULT 0,
    "is_premium" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "metadata" JSONB DEFAULT '{}', -- For additional app-specific configuration
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Company installed applications table
CREATE TABLE IF NOT EXISTS "public"."company_applications" (
    "id" UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "company_id" UUID NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
    "application_id" UUID NOT NULL REFERENCES "public"."applications"("id") ON DELETE CASCADE,
    "installed_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "installed_by" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    "is_active" BOOLEAN DEFAULT true,
    "configuration" JSONB DEFAULT '{}', -- App-specific configuration
    "settings" JSONB DEFAULT '{}', -- User-configurable settings
    "credentials" JSONB DEFAULT '{}', -- Encrypted credentials (API keys, etc.)
    "last_used_at" TIMESTAMPTZ,
    "usage_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one installation per company per application
    UNIQUE(company_id, application_id)
);

-- Application permissions table (for future use)
CREATE TABLE IF NOT EXISTS "public"."application_permissions" (
    "id" UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "application_id" UUID NOT NULL REFERENCES "public"."applications"("id") ON DELETE CASCADE,
    "permission_name" TEXT NOT NULL,
    "description" TEXT,
    "is_required" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "applications_category_idx" ON "public"."applications" USING btree ("category");
CREATE INDEX IF NOT EXISTS "applications_category_id_idx" ON "public"."applications" USING btree ("category_id");
CREATE INDEX IF NOT EXISTS "applications_is_active_idx" ON "public"."applications" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "applications_is_premium_idx" ON "public"."applications" USING btree ("is_premium");
CREATE INDEX IF NOT EXISTS "applications_rating_idx" ON "public"."applications" USING btree ("rating");
CREATE INDEX IF NOT EXISTS "applications_tags_idx" ON "public"."applications" USING gin ("tags");

CREATE INDEX IF NOT EXISTS "company_applications_company_id_idx" ON "public"."company_applications" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "company_applications_application_id_idx" ON "public"."company_applications" USING btree ("application_id");
CREATE INDEX IF NOT EXISTS "company_applications_is_active_idx" ON "public"."company_applications" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "company_applications_installed_at_idx" ON "public"."company_applications" USING btree ("installed_at");

CREATE INDEX IF NOT EXISTS "application_permissions_application_id_idx" ON "public"."application_permissions" USING btree ("application_id");

-- Insert default application categories
INSERT INTO "public"."application_categories" ("name", "description", "icon", "sort_order") VALUES
    ('communication', 'Team communication and collaboration tools', 'MessageSquare', 1),
    ('productivity', 'Productivity and workflow management tools', 'FileSpreadsheet', 2),
    ('marketing', 'Marketing automation and campaign management', 'Target', 3),
    ('analytics', 'Data analytics and business intelligence', 'BarChart3', 4),
    ('crm', 'Customer relationship management', 'Users', 5),
    ('finance', 'Financial management and accounting', 'DollarSign', 6)
ON CONFLICT (name) DO NOTHING;

-- Insert sample applications
INSERT INTO "public"."applications" (
    "name", 
    "description", 
    "long_description", 
    "category", 
    "developer", 
    "version", 
    "icon_url", 
    "documentation_url", 
    "pricing_model", 
    "price", 
    "features", 
    "tags", 
    "rating", 
    "download_count", 
    "is_premium"
) VALUES
    (
        'Slack',
        'Connect your team with instant messaging and notifications',
        'Slack integration allows you to send notifications, alerts, and reports directly to your team channels. Set up custom webhooks and automate your workflow communications.',
        'communication',
        'Slack Technologies',
        '2.4.1',
        '/api/placeholder/64/64',
        'https://docs.slack.com',
        'free',
        null,
        '["Automatic notifications", "Customizable webhooks", "Report scheduling", "Team collaboration"]',
        '{"communication", "teamwork", "notifications"}',
        4.8,
        12500,
        false
    ),
    (
        'Google Sheets',
        'Export and sync your data with Google Sheets in real-time',
        'Seamlessly integrate with Google Sheets to automatically export reports, sync data in real-time, and create custom dashboards. Perfect for data analysis and reporting.',
        'productivity',
        'Google LLC',
        '1.8.3',
        '/api/placeholder/64/64',
        'https://developers.google.com/sheets',
        'free',
        null,
        '["Real-time sync", "Automated reports", "Custom templates", "Data visualization"]',
        '{"spreadsheets", "export", "reports"}',
        4.9,
        18750,
        false
    ),
    (
        'Trello',
        'Organize projects and tasks with visual board management',
        'Create cards, manage workflows, and track project progress with Trello integration. Automatically sync tasks and deadlines with your team boards.',
        'productivity',
        'Atlassian',
        '3.1.0',
        '/api/placeholder/64/64',
        'https://developer.atlassian.com/cloud/trello',
        'free',
        null,
        '["Auto card creation", "Custom workflows", "Team boards", "Progress tracking"]',
        '{"project management", "tasks", "organization"}',
        4.6,
        8300,
        false
    ),
    (
        'HubSpot CRM',
        'Advanced customer relationship management and sales automation',
        'Powerful CRM integration with lead management, contact synchronization, deal tracking, and automated sales workflows. Perfect for growing businesses.',
        'crm',
        'HubSpot Inc.',
        '4.2.1',
        '/api/placeholder/64/64',
        'https://developers.hubspot.com',
        'subscription',
        '$29/month',
        '["Lead management", "Contact sync", "Deal tracking", "Sales automation"]',
        '{"crm", "customers", "sales"}',
        4.7,
        15200,
        true
    ),
    (
        'Gmail',
        'Email marketing automation and campaign management',
        'Send automated email campaigns, manage contact lists, and track delivery performance. Create professional email templates and monitor engagement metrics.',
        'communication',
        'Google LLC',
        '2.1.5',
        '/api/placeholder/64/64',
        'https://developers.google.com/gmail',
        'free',
        null,
        '["Email campaigns", "Template management", "Delivery tracking", "Contact lists"]',
        '{"email", "marketing", "automation"}',
        4.5,
        9800,
        false
    ),
    (
        'Power BI',
        'Advanced business intelligence and data visualization',
        'Create stunning dashboards and reports with Microsoft Power BI. Connect your data sources and build comprehensive analytics solutions for your business.',
        'analytics',
        'Microsoft Corporation',
        '1.5.2',
        '/api/placeholder/64/64',
        'https://docs.microsoft.com/power-bi',
        'subscription',
        '$45/month',
        '["Custom dashboards", "Real-time analytics", "Data modeling", "Report sharing"]',
        '{"analytics", "visualization", "business intelligence"}',
        4.4,
        6700,
        true
    )
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."application_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."application_permissions" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for applications (publicly readable)
DO $$ BEGIN
    CREATE POLICY "Applications are publicly readable" ON "public"."applications"
        FOR SELECT TO authenticated, anon
        USING (is_active = true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- RLS Policies for application categories (publicly readable)
DO $$ BEGIN
    CREATE POLICY "Application categories are publicly readable" ON "public"."application_categories"
        FOR SELECT TO authenticated, anon
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- RLS Policies for company applications (company members only)
DO $$ BEGIN
    CREATE POLICY "Users can view company applications" ON "public"."company_applications"
        FOR SELECT TO authenticated
        USING (
            company_id IN (
                SELECT company_id 
                FROM company_users 
                WHERE user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can install applications for their companies" ON "public"."company_applications"
        FOR INSERT TO authenticated
        WITH CHECK (
            company_id IN (
                SELECT company_id 
                FROM company_users 
                WHERE user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update applications for their companies" ON "public"."company_applications"
        FOR UPDATE TO authenticated
        USING (
            company_id IN (
                SELECT company_id 
                FROM company_users 
                WHERE user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can uninstall applications for their companies" ON "public"."company_applications"
        FOR DELETE TO authenticated
        USING (
            company_id IN (
                SELECT company_id 
                FROM company_users 
                WHERE user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- RLS Policies for application permissions (publicly readable)
DO $$ BEGIN
    CREATE POLICY "Application permissions are publicly readable" ON "public"."application_permissions"
        FOR SELECT TO authenticated, anon
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Grant necessary permissions
GRANT SELECT ON TABLE "public"."applications" TO anon, authenticated;
GRANT SELECT ON TABLE "public"."application_categories" TO anon, authenticated;
GRANT ALL ON TABLE "public"."company_applications" TO authenticated;
GRANT SELECT ON TABLE "public"."application_permissions" TO anon, authenticated;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DO $$ BEGIN
    CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_application_categories_updated_at BEFORE UPDATE ON application_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_company_applications_updated_at BEFORE UPDATE ON company_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;