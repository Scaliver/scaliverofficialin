
ALTER TABLE public.upi_payment_requests
  ALTER COLUMN product_id TYPE text USING product_id::text;
