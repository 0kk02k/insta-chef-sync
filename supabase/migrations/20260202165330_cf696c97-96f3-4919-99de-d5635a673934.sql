-- Enum für Rollen
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Rollen-Tabelle
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- RLS aktivieren
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security Definer Funktion (verhindert RLS-Rekursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies für user_roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- AI Prompts Tabelle
CREATE TABLE public.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL UNIQUE,
  prompt_template text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- RLS für ai_prompts
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view prompts" ON public.ai_prompts
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert prompts" ON public.ai_prompts
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update prompts" ON public.ai_prompts
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete prompts" ON public.ai_prompts
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Trigger für updated_at
CREATE TRIGGER update_ai_prompts_updated_at
BEFORE UPDATE ON public.ai_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Initial-Admin setzen (für okko.prothmann@gmail.com)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users 
WHERE email = 'okko.prothmann@gmail.com'
ON CONFLICT DO NOTHING;