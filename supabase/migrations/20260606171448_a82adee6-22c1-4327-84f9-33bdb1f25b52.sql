
-- 1. User notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.user_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users mark own notifications read" ON public.user_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id, created_at DESC);

-- 2. Admin debit RPC (mirror of admin_credit_crypto_wallet)
CREATE OR REPLACE FUNCTION public.admin_debit_crypto_wallet(
  p_user_id uuid, p_amount numeric, p_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ref text;
  v_balance numeric;
  v_new_balance numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  SELECT balance INTO v_balance FROM public.crypto_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'User has no USDT wallet';
  END IF;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient USDT balance (have %, need %)', v_balance, p_amount;
  END IF;

  v_ref := 'ADMIN-DEBIT-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);

  UPDATE public.crypto_wallets
     SET balance = balance - p_amount, updated_at = now()
   WHERE user_id = p_user_id
   RETURNING balance INTO v_new_balance;

  INSERT INTO public.crypto_orders (
    user_id, order_reference, request_type, amount, currency, network,
    status, credited, notes, metadata
  ) VALUES (
    p_user_id, v_ref, 'admin_debit', p_amount, 'USDT', 'MANUAL',
    'success', false, COALESCE(p_note, 'Manual admin debit'),
    jsonb_build_object('admin_id', auth.uid(), 'balance_before', v_balance, 'balance_after', v_new_balance)
  );

  INSERT INTO public.audit_logs (admin_id, action, resource_type, details)
  VALUES (auth.uid(), 'admin_manual_crypto_debit', 'crypto_wallets',
          jsonb_build_object('user_id', p_user_id, 'amount', p_amount, 'note', p_note,
                             'ref', v_ref, 'balance_before', v_balance, 'balance_after', v_new_balance));

  INSERT INTO public.user_notifications (user_id, title, message, type, metadata)
  VALUES (p_user_id, 'USDT Wallet Updated',
          '-' || p_amount::text || ' USDT deducted by Admin' ||
          CASE WHEN p_note IS NOT NULL AND length(p_note) > 0 THEN ' — ' || p_note ELSE '' END,
          'warning', jsonb_build_object('amount', p_amount, 'type', 'debit', 'ref', v_ref));

  RETURN jsonb_build_object('success', true, 'reference', v_ref,
                            'balance_before', v_balance, 'balance_after', v_new_balance);
END;
$$;

-- 3. Patch credit function to also emit a user notification
CREATE OR REPLACE FUNCTION public.admin_credit_crypto_wallet(
  p_user_id uuid, p_amount numeric, p_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ref text;
  v_before numeric;
  v_after numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  v_ref := 'ADMIN-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);

  INSERT INTO public.crypto_wallets (user_id, balance) VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_before FROM public.crypto_wallets WHERE user_id = p_user_id FOR UPDATE;

  UPDATE public.crypto_wallets
     SET balance = balance + p_amount, updated_at = now()
   WHERE user_id = p_user_id
   RETURNING balance INTO v_after;

  INSERT INTO public.crypto_orders (
    user_id, order_reference, request_type, amount, currency, network,
    status, credited, notes, metadata
  ) VALUES (
    p_user_id, v_ref, 'admin_credit', p_amount, 'USDT', 'MANUAL',
    'success', true, COALESCE(p_note, 'Manual admin credit'),
    jsonb_build_object('admin_id', auth.uid(), 'balance_before', v_before, 'balance_after', v_after)
  );

  INSERT INTO public.audit_logs (admin_id, action, resource_type, details)
  VALUES (auth.uid(), 'admin_manual_crypto_credit', 'crypto_wallets',
          jsonb_build_object('user_id', p_user_id, 'amount', p_amount, 'note', p_note,
                             'ref', v_ref, 'balance_before', v_before, 'balance_after', v_after));

  INSERT INTO public.user_notifications (user_id, title, message, type, metadata)
  VALUES (p_user_id, 'USDT Wallet Updated',
          '+' || p_amount::text || ' USDT credited by Admin' ||
          CASE WHEN p_note IS NOT NULL AND length(p_note) > 0 THEN ' — ' || p_note ELSE '' END,
          'success', jsonb_build_object('amount', p_amount, 'type', 'credit', 'ref', v_ref));

  RETURN jsonb_build_object('success', true, 'reference', v_ref,
                            'balance_before', v_before, 'balance_after', v_after);
END;
$$;
