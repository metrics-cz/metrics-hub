-- Create company-logos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
);

-- Allow public read access to company logos
CREATE POLICY "Company logos are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'company-logos');

-- Allow authenticated users to upload logos for their companies
CREATE POLICY "Users can upload logos for their companies" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'company-logos' AND
  auth.uid() IN (
    SELECT cu.user_id 
    FROM company_users cu 
    WHERE cu.company_id::text = (storage.foldername(name))[1]
    AND cu.role IN ('owner', 'admin', 'superadmin')
  )
);

-- Allow authenticated users to update logos for their companies
CREATE POLICY "Users can update logos for their companies" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'company-logos' AND
  auth.uid() IN (
    SELECT cu.user_id 
    FROM company_users cu 
    WHERE cu.company_id::text = (storage.foldername(name))[1]
    AND cu.role IN ('owner', 'admin', 'superadmin')
  )
);

-- Allow authenticated users to delete logos for their companies
CREATE POLICY "Users can delete logos for their companies" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'company-logos' AND
  auth.uid() IN (
    SELECT cu.user_id 
    FROM company_users cu 
    WHERE cu.company_id::text = (storage.foldername(name))[1]
    AND cu.role IN ('owner', 'admin', 'superadmin')
  )
);