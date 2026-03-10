ALTER TYPE public.app_role ADD VALUE 'casher';

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS TABLE(role public.app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id;
$$;

ALTER TABLE public.services
ADD COLUMN eid_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;


-- Grant full access (SELECT, INSERT, UPDATE, DELETE) on bills to cashers
CREATE POLICY "Allow cashers to manage bills"
ON public.bills
FOR ALL
TO authenticated
USING (
  (SELECT has_role(auth.uid(), 'casher'))
);

-- Grant full access (SELECT, INSERT, UPDATE, DELETE) on bookings to cashers
CREATE POLICY "Allow cashers to manage bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (
  (SELECT has_role(auth.uid(), 'casher'))
);


CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage all settings
CREATE POLICY "Admins can manage settings"
ON public.settings
FOR ALL
TO authenticated
USING (
  (SELECT has_role(auth.uid(), 'admin'))
)
WITH CHECK (
  (SELECT has_role(auth.uid(), 'admin'))
);

-- All authenticated users can read settings
CREATE POLICY "Authenticated users can read settings"
ON public.settings
FOR SELECT
TO authenticated
USING (true);

-- Function to update the updated_at column
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default values for the settings
INSERT INTO public.settings (key, value) VALUES
('eid_fee', '20'),
('eid_interval', '{"start": "2026-03-16", "end": "2026-03-20"}'),
('default_language', '"en"');