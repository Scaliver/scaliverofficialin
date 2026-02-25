
-- 1. Insert Matrix Sols as a digital-topup provider in smm_apis
INSERT INTO smm_apis (name, api_url, api_key, api_type, is_active, email)
VALUES (
  'Matrix Sols',
  'https://matrix-sols.com/api/v1',
  'configured-via-secrets',
  'digital-topup',
  true,
  NULL
);

-- 2. Set MLBB SMALL PACK to in_stock = true for testing
UPDATE products SET in_stock = true WHERE slug = 'Mlbb-small';

-- 3. Link the "3 Diamonds" tier (sort_order=0, price=7) to Matrix API item 382
-- First get the Matrix provider ID we just inserted
UPDATE pricing_tiers 
SET provider_id = (SELECT id FROM smm_apis WHERE name = 'Matrix Sols' AND api_type = 'digital-topup' LIMIT 1),
    provider_product_id = '382'
WHERE id = '8feb7a93-8e6c-455d-8c90-b9791cd10ee9';
