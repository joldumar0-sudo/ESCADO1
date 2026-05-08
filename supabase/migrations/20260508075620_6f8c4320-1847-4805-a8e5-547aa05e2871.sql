
-- Activities table
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  sections scout_section[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY activities_select_auth ON public.activities
  FOR SELECT TO authenticated USING (true);
CREATE POLICY activities_staff_insert ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid());
CREATE POLICY activities_staff_update ON public.activities
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY activities_staff_delete ON public.activities
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_activities_updated
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Attendance
CREATE TYPE public.attendance_status AS ENUM ('presente','ausente','justificado');

CREATE TABLE public.activity_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'presente',
  notes text,
  marked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, user_id)
);

ALTER TABLE public.activity_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY att_select_auth ON public.activity_attendance
  FOR SELECT TO authenticated USING (true);
CREATE POLICY att_staff_insert ON public.activity_attendance
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND marked_by = auth.uid());
CREATE POLICY att_staff_update ON public.activity_attendance
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY att_staff_delete ON public.activity_attendance
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_attendance_updated
  BEFORE UPDATE ON public.activity_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Allow admin to delete any documents / gallery / chat
DROP POLICY IF EXISTS documents_staff_delete ON public.documents;
CREATE POLICY documents_delete ON public.documents
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR uploaded_by = auth.uid());

DROP POLICY IF EXISTS gallery_staff_delete ON public.gallery;
CREATE POLICY gallery_delete ON public.gallery
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR uploaded_by = auth.uid());
