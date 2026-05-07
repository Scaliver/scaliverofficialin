
-- Add reseller role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reseller';

-- Per-tier active flag
ALTER TABLE public.pricing_tiers
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Reseller discount percent setting
INSERT INTO public.site_settings (key, value)
VALUES ('reseller_discount_percent', '{"percent": 0}'::jsonb)
ON CONFLICT (key) DO NOTHING;
