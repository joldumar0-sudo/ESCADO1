DROP POLICY IF EXISTS dm_update_recipient ON public.direct_messages;

CREATE OR REPLACE FUNCTION public.mark_dm_read(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.direct_messages
  SET read_at = COALESCE(read_at, now())
  WHERE id = _id AND recipient_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.mark_dm_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_dm_read(uuid) TO authenticated;

-- Lock down SECURITY DEFINER helpers from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_members_with_email() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_members_with_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;