
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin','dirigente','jovem','membro');
CREATE TYPE public.scout_section AS ENUM ('lobinho','escoteiro','senior','pioneiro','dirigente','outro');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  bio TEXT,
  avatar_url TEXT,
  section public.scout_section NOT NULL DEFAULT 'outro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','dirigente'));
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- handle_new_user trigger -> profile + default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'membro');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: profiles
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- RLS: user_roles
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_select_auth" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "documents_staff_write" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY "documents_staff_update" ON public.documents FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "documents_staff_delete" ON public.documents FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- Gallery
CREATE TABLE public.gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  event_name TEXT,
  image_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery_select_auth" ON public.gallery FOR SELECT TO authenticated USING (true);
CREATE POLICY "gallery_staff_write" ON public.gallery FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY "gallery_staff_delete" ON public.gallery FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- Info pages
CREATE TABLE public.info_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.info_pages ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_info_pages_updated BEFORE UPDATE ON public.info_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "info_select_auth" ON public.info_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "info_staff_write" ON public.info_pages FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND author_id = auth.uid());
CREATE POLICY "info_staff_update" ON public.info_pages FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "info_staff_delete" ON public.info_pages FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- Chat messages (geral)
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_select_auth" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "chat_insert_own" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat_delete_own_or_admin" ON public.chat_messages FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Direct messages
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_dm_pair ON public.direct_messages(sender_id, recipient_id, created_at);
CREATE POLICY "dm_select_participants" ON public.direct_messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "dm_insert_own" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "dm_update_recipient" ON public.direct_messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid());

-- AI conversations
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_ai_conv_updated BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "ai_conv_own" ON public.ai_conversations FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_msg_own" ON public.ai_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('documents','documents', false),
  ('gallery','gallery', true),
  ('avatars','avatars', true),
  ('info','info', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
-- documents: any authenticated user can read; only staff can write/delete
CREATE POLICY "docs_read_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='documents');
CREATE POLICY "docs_staff_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='documents' AND public.is_staff(auth.uid()));
CREATE POLICY "docs_staff_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='documents' AND public.is_staff(auth.uid()));
CREATE POLICY "docs_staff_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='documents' AND public.is_staff(auth.uid()));

-- gallery: public read, staff write
CREATE POLICY "gallery_public_read" ON storage.objects FOR SELECT USING (bucket_id='gallery');
CREATE POLICY "gallery_staff_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='gallery' AND public.is_staff(auth.uid()));
CREATE POLICY "gallery_staff_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='gallery' AND public.is_staff(auth.uid()));

-- info: public read, staff write
CREATE POLICY "info_public_read" ON storage.objects FOR SELECT USING (bucket_id='info');
CREATE POLICY "info_staff_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='info' AND public.is_staff(auth.uid()));
CREATE POLICY "info_staff_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='info' AND public.is_staff(auth.uid()));

-- avatars: public read, owner write (folder = user id)
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id='avatars');
CREATE POLICY "avatars_owner_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
