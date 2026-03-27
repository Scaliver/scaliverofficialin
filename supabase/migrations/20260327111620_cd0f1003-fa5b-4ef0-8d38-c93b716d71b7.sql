-- Update all MLBB pricing tiers that have Matrix item IDs as provider_product_id 
-- to point to the SmileOne provider. The provider_product_id values (382, 383, 384, etc.) 
-- were Matrix IDs and need to be replaced with SmileOne SKU IDs once we can fetch them.
-- For now, link them to SmileOne provider so the routing works.
UPDATE public.pricing_tiers 
SET provider_id = '46348dcb-0538-4e1f-ade6-c4670e6e0808'
WHERE provider_product_id IN ('382', '383', '384', '385', '386', '387', '388', '389', '390', '391', '392', '393', '394', '395', '396', '397', '398')
AND provider_id IS NOT NULL;