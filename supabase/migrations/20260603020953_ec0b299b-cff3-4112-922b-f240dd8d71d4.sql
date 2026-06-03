CREATE TABLE public.crypto_deposit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crypto_order_id uuid,
  order_reference text,
  transaction_hash text,
  amount numeric,
  status text NOT NULL DEFAULT 'info',
  step text NOT NULL,
  error_message text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.crypto_deposit_logs TO authenticated;
GRANT ALL ON public.crypto_deposit_logs TO service_role;

ALTER TABLE public.crypto_deposit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view crypto deposit logs"
ON public.crypto_deposit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert crypto deposit logs"
ON public.crypto_deposit_logs
FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_crypto_deposit_logs_order_reference ON public.crypto_deposit_logs(order_reference, created_at DESC);
CREATE INDEX idx_crypto_deposit_logs_tx_hash ON public.crypto_deposit_logs(transaction_hash);
CREATE INDEX idx_crypto_deposit_logs_user_id ON public.crypto_deposit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_orders_order_reference_unique ON public.crypto_orders(order_reference);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crypto_orders_transaction_hash_unique
  ON public.crypto_orders(transaction_hash)
  WHERE transaction_hash IS NOT NULL;

ALTER TABLE public.crypto_orders
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS amount_paid numeric,
  ADD COLUMN IF NOT EXISTS error_message text;

CREATE OR REPLACE FUNCTION public.process_crypto_deposit(
  p_user_id uuid,
  p_order_reference text,
  p_transaction_hash text,
  p_amount numeric,
  p_status text DEFAULT 'credited',
  p_source text DEFAULT 'verify',
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.crypto_orders%ROWTYPE;
  v_existing_tx_order text;
  v_wallet_balance numeric;
  v_credit_amount numeric;
BEGIN
  INSERT INTO public.crypto_deposit_logs (
    user_id, order_reference, transaction_hash, amount, status, step, details
  ) VALUES (
    p_user_id, p_order_reference, p_transaction_hash, p_amount, 'info', 'payment_detected',
    jsonb_build_object('source', p_source, 'status', p_status, 'payload', COALESCE(p_payload, '{}'::jsonb))
  );

  IF p_status IS DISTINCT FROM 'credited' THEN
    INSERT INTO public.crypto_deposit_logs (
      user_id, order_reference, transaction_hash, amount, status, step, error_message, details
    ) VALUES (
      p_user_id, p_order_reference, p_transaction_hash, p_amount, 'warning', 'payment_not_ready',
      'Waiting for blockchain confirmations',
      jsonb_build_object('source', p_source, 'status', p_status)
    );

    RETURN jsonb_build_object(
      'success', false,
      'confirming', true,
      'error', 'Waiting for blockchain confirmations',
      'status', p_status
    );
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid credited amount';
  END IF;

  v_credit_amount := p_amount;

  SELECT * INTO v_order
  FROM public.crypto_orders
  WHERE order_reference = p_order_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crypto order not found';
  END IF;

  IF v_order.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Crypto order user mismatch';
  END IF;

  IF p_transaction_hash IS NOT NULL THEN
    SELECT order_reference INTO v_existing_tx_order
    FROM public.crypto_orders
    WHERE transaction_hash = p_transaction_hash
      AND order_reference <> p_order_reference
    LIMIT 1;

    IF v_existing_tx_order IS NOT NULL THEN
      RAISE EXCEPTION 'Transaction hash already processed for order %', v_existing_tx_order;
    END IF;
  END IF;

  IF v_order.credited IS TRUE THEN
    INSERT INTO public.crypto_deposit_logs (
      user_id, crypto_order_id, order_reference, transaction_hash, amount, status, step, details
    ) VALUES (
      p_user_id, v_order.id, p_order_reference, COALESCE(p_transaction_hash, v_order.transaction_hash), v_credit_amount,
      'success', 'duplicate_skipped',
      jsonb_build_object('source', p_source, 'wallet_already_credited', true)
    );

    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'credited_amount', COALESCE(v_order.amount_paid, v_credit_amount),
      'wallet_balance', (SELECT balance FROM public.crypto_wallets WHERE user_id = p_user_id)
    );
  END IF;

  INSERT INTO public.crypto_deposit_logs (
    user_id, crypto_order_id, order_reference, transaction_hash, amount, status, step, details
  ) VALUES (
    p_user_id, v_order.id, p_order_reference, p_transaction_hash, v_credit_amount, 'info', 'wallet_credit_started',
    jsonb_build_object('source', p_source)
  );

  INSERT INTO public.crypto_wallets (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.crypto_wallets
  SET balance = balance + v_credit_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_wallet_balance;

  INSERT INTO public.coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (
    p_user_id,
    v_credit_amount,
    'credit',
    'Crypto wallet deposit (' || COALESCE(p_order_reference, 'unknown') || ')',
    v_order.id
  );

  UPDATE public.crypto_orders
  SET credited = true,
      status = 'success',
      transaction_hash = COALESCE(p_transaction_hash, transaction_hash),
      amount_paid = v_credit_amount,
      notes = 'Wallet credited automatically',
      error_message = NULL,
      completed_at = now(),
      updated_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'finalized_by', p_source,
        'finalized_status', p_status,
        'finalized_at', now(),
        'last_payload', COALESCE(p_payload, '{}'::jsonb)
      )
  WHERE id = v_order.id;

  INSERT INTO public.crypto_deposit_logs (
    user_id, crypto_order_id, order_reference, transaction_hash, amount, status, step, details
  ) VALUES (
    p_user_id, v_order.id, p_order_reference, COALESCE(p_transaction_hash, v_order.transaction_hash), v_credit_amount,
    'success', 'wallet_credit_completed',
    jsonb_build_object('source', p_source, 'wallet_balance', v_wallet_balance)
  );

  INSERT INTO public.audit_logs (admin_id, action, resource_type, resource_id, details)
  VALUES (
    p_user_id,
    'crypto_deposit_completed',
    'crypto_orders',
    v_order.id,
    jsonb_build_object(
      'order_reference', p_order_reference,
      'transaction_hash', COALESCE(p_transaction_hash, v_order.transaction_hash),
      'amount', v_credit_amount,
      'wallet_balance', v_wallet_balance,
      'source', p_source
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'credited_amount', v_credit_amount,
    'wallet_balance', v_wallet_balance,
    'order_id', v_order.id,
    'order_reference', p_order_reference
  );
EXCEPTION
  WHEN OTHERS THEN
    UPDATE public.crypto_orders
    SET status = CASE WHEN status = 'success' THEN status ELSE 'failed' END,
        transaction_hash = COALESCE(p_transaction_hash, transaction_hash),
        error_message = SQLERRM,
        notes = SQLERRM,
        updated_at = now()
    WHERE order_reference = p_order_reference;

    INSERT INTO public.crypto_deposit_logs (
      user_id, order_reference, transaction_hash, amount, status, step, error_message, details
    ) VALUES (
      p_user_id, p_order_reference, p_transaction_hash, p_amount, 'error', 'deposit_failed', SQLERRM,
      jsonb_build_object('source', p_source, 'payload', COALESCE(p_payload, '{}'::jsonb))
    );

    INSERT INTO public.audit_logs (admin_id, action, resource_type, details)
    VALUES (
      p_user_id,
      'crypto_deposit_processing_failed',
      'crypto_orders',
      jsonb_build_object(
        'order_reference', p_order_reference,
        'transaction_hash', p_transaction_hash,
        'amount', p_amount,
        'error', SQLERRM,
        'source', p_source
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'order_reference', p_order_reference
    );
END;
$$;

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
  v_result jsonb;
BEGIN
  v_result := public.process_crypto_deposit(
    p_user_id,
    p_order_reference,
    NULL,
    p_amount,
    'credited',
    'legacy_rpc',
    '{}'::jsonb
  );

  IF COALESCE((v_result ->> 'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION '%', COALESCE(v_result ->> 'error', 'Crypto deposit failed');
  END IF;

  RETURN true;
END;
$$;

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
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_new_status NOT IN ('pending','confirming','success','failed') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT * INTO v_order
  FROM public.crypto_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF p_new_status = 'success' THEN
    v_result := public.process_crypto_deposit(
      v_order.user_id,
      v_order.order_reference,
      v_order.transaction_hash,
      COALESCE(v_order.amount_paid, v_order.amount),
      'credited',
      'admin_status',
      COALESCE(v_order.metadata, '{}'::jsonb)
    );
    RETURN v_result;
  END IF;

  UPDATE public.crypto_orders
  SET status = p_new_status,
      credited = CASE WHEN p_new_status = 'failed' THEN false ELSE credited END,
      error_message = CASE WHEN p_new_status = 'failed' THEN COALESCE(error_message, 'Marked failed by admin') ELSE error_message END,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.crypto_deposit_logs (
    user_id, crypto_order_id, order_reference, transaction_hash, amount, status, step, error_message, details
  ) VALUES (
    v_order.user_id,
    v_order.id,
    v_order.order_reference,
    v_order.transaction_hash,
    COALESCE(v_order.amount_paid, v_order.amount),
    CASE WHEN p_new_status = 'failed' THEN 'error' ELSE 'info' END,
    'admin_status_update',
    CASE WHEN p_new_status = 'failed' THEN 'Marked failed by admin' ELSE NULL END,
    jsonb_build_object('new_status', p_new_status, 'admin_id', auth.uid())
  );

  RETURN jsonb_build_object('success', true, 'status', p_new_status);
END;
$$;

ALTER TABLE public.crypto_deposit_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_deposit_logs;