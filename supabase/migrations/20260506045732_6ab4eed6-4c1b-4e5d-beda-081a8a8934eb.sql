-- Restrict access to profiles.email column from regular authenticated users
-- Admins use get_members_with_email() (SECURITY DEFINER) to access emails
REVOKE SELECT (email) ON public.profiles FROM authenticated;
REVOKE SELECT (email) ON public.profiles FROM anon;

-- Add SELECT policies for storage buckets (avatars, gallery, info)
CREATE POLICY "avatars_select_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "gallery_select_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'gallery');

CREATE POLICY "info_select_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'info');