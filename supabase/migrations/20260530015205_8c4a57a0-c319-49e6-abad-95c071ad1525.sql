
-- 1. Crypto wallets table
CREATE TABLE public.crypto_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.crypto_wallets TO authenticated;
GRANT ALL ON public.crypto_wallets TO service_role;

ALTER TABLE public.crypto_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own crypto wallet"
  ON public.crypto_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all crypto wallets"
  ON public.crypto_wallets FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update crypto wallets"
  ON public.crypto_wallets FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete crypto wallets"
  ON public.crypto_wallets FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_crypto_wallets_updated_at
  BEFORE UPDATE ON public.crypto_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill wallets for existing users
INSERT INTO public.crypto_wallets (user_id, balance)
SELECT id, 0 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Extend handle_new_user_wallet trigger to also create crypto wallet
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.crypto_wallets (user_id, balance) VALUES (NEW.id, 0)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 2. Extend crypto_orders with type/notes if missing (already has request_type, status etc.)
ALTER TABLE public.crypto_orders
  ADD COLUMN IF NOT EXISTS notes text;

-- 3. Credit function (idempotent)
CREATE OR REPLACE FUNCTION public.credit_crypto_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_order_reference text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_already boolean;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  -- Idempotency: if order already credited, skip
  SELECT credited INTO v_already
  FROM public.crypto_orders
  WHERE order_reference = p_order_reference
  FOR UPDATE;

  IF v_already IS TRUE THEN
    RETURN true;
  END IF;

  -- Ensure wallet row exists
  INSERT INTO public.crypto_wallets (user_id, balance) VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.crypto_wallets
     SET balance = balance + p_amount, updated_at = now()
   WHERE user_id = p_user_id;

  UPDATE public.crypto_orders
     SET credited = true, status = 'success', updated_at = now()
   WHERE order_reference = p_order_reference;

  RETURN true;
END;
$$;

-- 4. Debit function (atomic; used for product purchases via USDT)
CREATE OR REPLACE FUNCTION public.debit_crypto_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_reference text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  SELECT balance INTO v_balance
  FROM public.crypto_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Crypto wallet not found';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient USDT balance';
  END IF;

  UPDATE public.crypto_wallets
    SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;

-- 5. Admin status change function (Success / Failed / Pending) - adjusts balance for top-ups
CREATE OR REPLACE FUNCTION public.admin_set_crypto_order_status(
  p_order_id uuid,
  p_new_status text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.crypto_orders%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_new_status NOT IN ('pending','success','failed') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT * INTO v_order FROM public.crypto_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- For top-ups: ensure balance is consistent with status
  IF v_order.request_type = 'coin_recharge' OR v_order.request_type = 'topup' THEN
    IF p_new_status = 'success' AND NOT v_order.credited THEN
      INSERT INTO public.crypto_wallets (user_id, balance) VALUES (v_order.user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;
      UPDATE public.crypto_wallets
        SET balance = balance + v_order.amount, updated_at = now()
        WHERE user_id = v_order.user_id;
      UPDATE public.crypto_orders SET credited = true WHERE id = p_order_id;
    ELSIF p_new_status <> 'success' AND v_order.credited THEN
      -- Reverse a previously-credited top-up
      UPDATE public.crypto_wallets
        SET balance = GREATEST(balance - v_order.amount, 0), updated_at = now()
        WHERE user_id = v_order.user_id;
      UPDATE public.crypto_orders SET credited = false WHERE id = p_order_id;
    END IF;
  END IF;

  UPDATE public.crypto_orders SET status = p_new_status, updated_at = now() WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'status', p_new_status);
END;
$$;

-- 6. Default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('usdt_to_inr_rate', '100'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO public.site_settings (key, value) VALUES
  ('crypto_enabled', 'true'::jsonb)
ON CONFLICT DO NOTHING;
