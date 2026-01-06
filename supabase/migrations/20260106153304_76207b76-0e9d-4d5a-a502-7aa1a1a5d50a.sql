-- Add api_type and email columns to smm_apis table
ALTER TABLE public.smm_apis 
ADD COLUMN api_type TEXT NOT NULL DEFAULT 'smm',
ADD COLUMN email TEXT;

-- Add provider columns to pricing_tiers table
ALTER TABLE public.pricing_tiers
ADD COLUMN provider_id UUID REFERENCES public.smm_apis(id) ON DELETE SET NULL,
ADD COLUMN provider_product_id TEXT;

-- Create index for faster lookups
CREATE INDEX idx_pricing_tiers_provider_id ON public.pricing_tiers(provider_id);