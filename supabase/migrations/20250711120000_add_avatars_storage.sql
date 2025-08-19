-- Create avatars storage bucket for user profile pictures
-- Note: Storage policies should be created through Supabase Dashboard or via service_role
-- This migration only creates the bucket, policies should be set up separately

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies need to be created with service_role permissions
-- These can be created through the Supabase Dashboard under Storage > Policies
-- or through the Supabase CLI with proper permissions

/*
Required storage policies for avatars bucket:
1. "Avatars are publicly accessible" - SELECT for all users on bucket_id = 'avatars'
2. "Authenticated users can upload own avatar" - INSERT for authenticated where owner matches auth.uid()
3. "Users can update their own avatar" - UPDATE for authenticated where owner matches auth.uid()  
4. "Users can delete their own avatar" - DELETE for authenticated where owner matches auth.uid()
*/