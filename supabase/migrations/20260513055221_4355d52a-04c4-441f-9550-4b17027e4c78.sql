
-- Coin packages table
CREATE TABLE public.coin_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  bonus numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coin_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active coin packages" ON public.coin_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all coin packages" ON public.coin_packages FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert coin packages" ON public.coin_packages FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update coin packages" ON public.coin_packages FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete coin packages" ON public.coin_packages FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_coin_packages_updated BEFORE UPDATE ON public.coin_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.coin_packages (amount, bonus, sort_order) VALUES
  (1, 0, 0), (50, 0, 1), (100, 5, 2), (200, 15, 3), (500, 50, 4), (1000, 150, 5), (2000, 400, 6);

-- Redeem codes
CREATE TABLE public.redeem_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  coins numeric NOT NULL,
  max_uses int NOT NULL DEFAULT 1,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view redeem codes" ON public.redeem_codes FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert redeem codes" ON public.redeem_codes FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update redeem codes" ON public.redeem_codes FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete redeem codes" ON public.redeem_codes FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_redeem_codes_updated BEFORE UPDATE ON public.redeem_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.redeem_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL,
  user_id uuid NOT NULL,
  coins_credited numeric NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);
ALTER TABLE public.redeem_code_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own redemptions" ON public.redeem_code_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all redemptions" ON public.redeem_code_redemptions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete redemptions" ON public.redeem_code_redemptions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Redeem function
CREATE OR REPLACE FUNCTION public.redeem_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code public.redeem_codes%ROWTYPE;
  v_balance numeric;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Login required');
  END IF;

  SELECT * INTO v_code FROM public.redeem_codes
    WHERE upper(code) = upper(_code) FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid code');
  END IF;

  IF NOT v_code.is_active THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code is inactive');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code has expired');
  END IF;

  IF v_code.used_count >= v_code.max_uses THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code has reached its usage limit');
  END IF;

  IF EXISTS (SELECT 1 FROM public.redeem_code_redemptions WHERE code_id = v_code.id AND user_id = v_user) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You have already redeemed this code');
  END IF;

  -- Credit wallet (create if missing)
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL THEN
    INSERT INTO public.wallets (user_id, balance) VALUES (v_user, v_code.coins);
  ELSE
    UPDATE public.wallets SET balance = balance + v_code.coins, updated_at = now() WHERE user_id = v_user;
  END IF;

  INSERT INTO public.coin_transactions (user_id, amount, type, description, reference_id)
    VALUES (v_user, v_code.coins, 'credit', 'Redeemed code: ' || v_code.code, v_code.id);

  INSERT INTO public.redeem_code_redemptions (code_id, user_id, coins_credited)
    VALUES (v_code.id, v_user, v_code.coins);

  UPDATE public.redeem_codes SET used_count = used_count + 1, updated_at = now() WHERE id = v_code.id;

  RETURN jsonb_build_object('success', true, 'coins', v_code.coins, 'message', 'Code redeemed successfully');
END;
$$;
