
ALTER TABLE public.upi_payment_requests
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS tier_id uuid,
  ADD COLUMN IF NOT EXISTS provider_id uuid,
  ADD COLUMN IF NOT EXISTS provider_product_id text,
  ADD COLUMN IF NOT EXISTS smm_service_id text,
  ADD COLUMN IF NOT EXISTS smm_quantity integer,
  ADD COLUMN IF NOT EXISTS is_social_media boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS redirect_path text;
