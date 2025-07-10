-- Create storage bucket for application icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-icons', 'application-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Enable public access to application icons
CREATE POLICY "Application icons are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'application-icons');

-- Allow authenticated users to upload application icons (for admin management)
CREATE POLICY "Admin users can upload application icons" ON storage.objects
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'application-icons');

-- Allow authenticated users to update application icons (for admin management)
CREATE POLICY "Admin users can update application icons" ON storage.objects
FOR UPDATE TO authenticated 
USING (bucket_id = 'application-icons');

-- Allow authenticated users to delete application icons (for admin management)
CREATE POLICY "Admin users can delete application icons" ON storage.objects
FOR DELETE TO authenticated 
USING (bucket_id = 'application-icons');