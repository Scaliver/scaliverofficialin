
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_request_id ON public.orders(payment_request_id) WHERE payment_request_id IS NOT NULL;
