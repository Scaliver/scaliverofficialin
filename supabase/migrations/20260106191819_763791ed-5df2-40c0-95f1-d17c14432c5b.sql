-- Add MLBB Brazil product
INSERT INTO products (name, slug, category, image_url, in_stock, description, instructions, is_social_media)
VALUES (
  'MLBB BRAZIL',
  'mlbb-brazil',
  'Mobile Legends',
  NULL,
  true,
  'Mobile Legends Bang Bang - Brazil Server Diamonds',
  ARRAY['Enter your Player ID', 'Enter your Zone/Server ID', 'Select diamond pack', 'Complete payment'],
  false
);