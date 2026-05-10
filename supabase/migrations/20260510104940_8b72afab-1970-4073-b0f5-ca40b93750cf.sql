
-- Reseller pricing overrides
CREATE TABLE IF NOT EXISTS public.reseller_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL UNIQUE,
  price numeric NOT NULL CHECK (price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reseller_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reseller prices"
  ON public.reseller_prices FOR SELECT USING (true);

CREATE POLICY "Admins can insert reseller prices"
  ON public.reseller_prices FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reseller prices"
  ON public.reseller_prices FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reseller prices"
  ON public.reseller_prices FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_reseller_prices_updated_at
  BEFORE UPDATE ON public.reseller_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-product field visibility flags
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS requires_player_id boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS requires_server_id boolean NOT NULL DEFAULT false;

-- USD->INR rate setting
INSERT INTO public.site_settings (key, value)
VALUES ('usd_inr_rate', '{"rate": 95}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Backfill pricing_tiers.sort_order from numeric portion of amount, fallback to price
UPDATE public.pricing_tiers
SET sort_order = COALESCE(
  NULLIF(regexp_replace(amount, '[^0-9]', '', 'g'), '')::int,
  price::int,
  0
);
