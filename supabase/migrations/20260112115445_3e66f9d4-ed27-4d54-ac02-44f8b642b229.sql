-- Fix Weekly Pass product slug
UPDATE products 
SET slug = 'weekly-pass' 
WHERE id = 'd49edd27-67c5-4264-8d0c-3fde7b5cedbc';

-- Add 'payment' as a valid api_type (already text column, just documenting the new type)
-- The smm_apis table will now support: 'smm', 'smileone', 'payment' types