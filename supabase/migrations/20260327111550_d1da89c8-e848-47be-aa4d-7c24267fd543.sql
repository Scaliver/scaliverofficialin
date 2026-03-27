-- Update existing Matrix Sols entry to SmileOne
UPDATE public.smm_apis 
SET name = 'SmileOne', 
    api_type = 'smilecode',
    api_url = 'https://www.smile.one/smilecode/api/',
    api_key = 'system-managed',
    updated_at = now()
WHERE api_type = 'digital-topup';

-- If no digital-topup entry existed, insert SmileOne
INSERT INTO public.smm_apis (name, api_type, api_url, api_key, email, is_active)
SELECT 'SmileOne', 'smilecode', 'https://www.smile.one/smilecode/api/', 'system-managed', 'chuimeikamei58@gmail.com', true
WHERE NOT EXISTS (SELECT 1 FROM public.smm_apis WHERE api_type = 'smilecode');