
-- Fix search_path on functions
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Restrict EXECUTE on security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM public, anon;

-- Drop broad public-read policies and replace with authenticated-read for listing protection
DROP POLICY IF EXISTS "gallery_public_read" ON storage.objects;
DROP POLICY IF EXISTS "info_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;

-- Public buckets: files served via public URL still work, but listing requires auth
CREATE POLICY "gallery_auth_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='gallery');
CREATE POLICY "info_auth_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='info');
CREATE POLICY "avatars_auth_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='avatars');
