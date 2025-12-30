-- Add smm_order_id column to orders table for tracking SMM API orders
ALTER TABLE public.orders ADD COLUMN smm_order_id TEXT;

-- Create index for faster lookups on SMM orders
CREATE INDEX idx_orders_smm_order_id ON public.orders(smm_order_id) WHERE smm_order_id IS NOT NULL;

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;