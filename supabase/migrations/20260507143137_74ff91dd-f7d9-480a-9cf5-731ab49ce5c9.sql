-- Clear SmileOne references from pricing tiers
UPDATE public.pricing_tiers
SET provider_id = NULL, provider_product_id = NULL
WHERE provider_id IN (SELECT id FROM public.smm_apis WHERE api_type = 'smilecode');

-- Remove SmileOne provider rows
DELETE FROM public.smm_apis WHERE api_type = 'smilecode';

-- Insert Aluu provider (uses api_key column to store the public api key; secret stays in env)
INSERT INTO public.smm_apis (name, api_url, api_key, api_type, is_active)
VALUES ('Aluu.in', 'https://aluu.in/api/v.1', 'managed_via_secret', 'aluu', true)
ON CONFLICT DO NOTHING;