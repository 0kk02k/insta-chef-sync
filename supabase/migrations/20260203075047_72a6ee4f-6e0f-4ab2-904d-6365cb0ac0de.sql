-- Einladungscodes Tabelle
CREATE TABLE public.invitation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- RLS aktivieren
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Nur Admins können Codes verwalten
CREATE POLICY "Admins can view all codes"
ON public.invitation_codes FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert codes"
ON public.invitation_codes FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update codes"
ON public.invitation_codes FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete codes"
ON public.invitation_codes FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- App-Settings Tabelle für globalen Code
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- RLS aktivieren
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Nur Admins können Settings verwalten
CREATE POLICY "Admins can view settings"
ON public.app_settings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
ON public.app_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
ON public.app_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings"
ON public.app_settings FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Initialer globaler Registrierungscode
INSERT INTO public.app_settings (key, value) 
VALUES ('global_registration_code', 'COOKINGCOMPILER2026')
ON CONFLICT (key) DO NOTHING;

-- Funktion zur Code-Validierung (ohne Auth, für Registrierung)
CREATE OR REPLACE FUNCTION public.validate_registration_code(input_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_valid boolean := false;
  global_code text;
BEGIN
  -- Prüfe Einmal-Code
  SELECT EXISTS (
    SELECT 1 FROM public.invitation_codes
    WHERE code = input_code
      AND is_active = true
      AND used_by IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO code_valid;
  
  IF code_valid THEN
    RETURN true;
  END IF;
  
  -- Prüfe globalen Code
  SELECT value INTO global_code
  FROM public.app_settings
  WHERE key = 'global_registration_code';
  
  IF global_code IS NOT NULL AND global_code = input_code THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Funktion zum Markieren eines verwendeten Codes
CREATE OR REPLACE FUNCTION public.use_invitation_code(input_code text, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invitation_codes
  SET used_by = user_id, used_at = now(), is_active = false
  WHERE code = input_code
    AND is_active = true
    AND used_by IS NULL;
END;
$$;