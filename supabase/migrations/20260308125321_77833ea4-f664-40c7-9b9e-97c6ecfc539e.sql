
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can read roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL,
  label text,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pricing config"
  ON public.pricing_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read enquiries"
  ON public.enquiries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update enquiries"
  ON public.enquiries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.pricing_config (config_key, config_value, label, description) VALUES
  ('time_premiums', '{"Morning": 1.0, "Afternoon": 1.0, "Early Morning": 1.1, "Evening": 1.2, "Late Night": 1.3, "Overnight": 1.5}', 'Time Premiums', 'Multipliers based on time of day'),
  ('journey_type_premiums', '{"Corporate": 1.0, "School Trip": 1.0, "Other": 1.0, "Airport Transfer": 1.1, "Wedding": 1.2, "Night Out": 1.3}', 'Journey Type Premiums', 'Multipliers based on journey type'),
  ('base_rate_per_mile', '5', 'Base Rate Per Mile', 'Base cost multiplied by distance and capacity ratio'),
  ('minimum_charge_per_mile', '3.33', 'Minimum Charge Per Mile', 'Minimum price floor per mile'),
  ('default_passengers', '8', 'Default Passengers', 'Assumed passenger count when not specified'),
  ('max_capacity', '16', 'Max Vehicle Capacity', 'Maximum seats for capacity ratio calculation');
