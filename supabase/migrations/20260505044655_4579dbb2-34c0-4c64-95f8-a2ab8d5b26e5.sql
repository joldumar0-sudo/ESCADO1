
-- 1) PROFILES: restrict email column readability
REVOKE SELECT (email) ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, full_name, avatar_url, bio, section, created_at, updated_at) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_members_with_email()
RETURNS TABLE (id uuid, full_name text, email text, avatar_url text, section public.scout_section)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email, p.avatar_url, p.section
  FROM public.profiles p
  WHERE public.is_staff(auth.uid())
  ORDER BY p.full_name NULLS LAST;
$$;
REVOKE ALL ON FUNCTION public.get_members_with_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_members_with_email() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT email FROM public.profiles WHERE id = auth.uid(); $$;
REVOKE ALL ON FUNCTION public.get_my_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;

-- 2) STORAGE UPDATE policies for info & gallery
CREATE POLICY "info_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'info' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'info' AND public.is_staff(auth.uid()));

CREATE POLICY "gallery_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'gallery' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'gallery' AND public.is_staff(auth.uid()));

-- 3) Drop broad listing SELECT on public buckets (public URLs still resolve via CDN)
DROP POLICY IF EXISTS "avatars_auth_read" ON storage.objects;
DROP POLICY IF EXISTS "gallery_auth_read" ON storage.objects;
DROP POLICY IF EXISTS "info_auth_read" ON storage.objects;

-- 4) Lock down internal helper functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated, anon, PUBLIC;
