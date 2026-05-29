-- Crypto orders table
CREATE TABLE public.crypto_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_reference text NOT NULL UNIQUE,
  external_order_id text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USDT',
  network text NOT NULL DEFAULT 'BEP20',
  wallet_address text,
  transaction_hash text,
  status text NOT NULL DEFAULT 'pending',
  request_type text NOT NULL DEFAULT 'coin_recharge',
  total_coins numeric,
  bonus_coins numeric DEFAULT 0,
  product_id text,
  tier_id uuid,
  player_id text,
  zone_id text,
  redirect_path text,
  credited boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.crypto_orders TO authenticated;
GRANT ALL ON public.crypto_orders TO service_role;

ALTER TABLE public.crypto_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own crypto orders"
  ON public.crypto_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all crypto orders"
  ON public.crypto_orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own crypto orders"
  ON public.crypto_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage crypto orders"
  ON public.crypto_orders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete crypto orders"
  ON public.crypto_orders FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_crypto_orders_updated_at
  BEFORE UPDATE ON public.crypto_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_crypto_orders_user_id ON public.crypto_orders(user_id);
CREATE INDEX idx_crypto_orders_status ON public.crypto_orders(status);

-- Category-level multiplier override
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS multipliers_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_multiplier integer NOT NULL DEFAULT 5;