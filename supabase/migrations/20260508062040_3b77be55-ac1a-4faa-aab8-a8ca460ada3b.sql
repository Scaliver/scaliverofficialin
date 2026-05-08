-- Atomic wallet deduction RPC
CREATE OR REPLACE FUNCTION public.process_order_payment(
  p_user_id uuid,
  p_amount numeric,
  p_order_id uuid,
  p_description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  -- Lock the wallet row
  SELECT balance INTO v_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Idempotency: skip if a debit transaction with this reference already exists
  IF EXISTS (
    SELECT 1 FROM public.coin_transactions
    WHERE reference_id = p_order_id AND type = 'debit'
  ) THEN
    RETURN true;
  END IF;

  UPDATE public.wallets
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (p_user_id, p_amount, 'debit', p_description, p_order_id);

  RETURN true;
END;
$$;

-- Enable scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if any
DO $$ BEGIN
  PERFORM cron.unschedule('sync-order-status-every-minute');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-order-status-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rhfpvuwefqfdqxscnquf.supabase.co/functions/v1/sync-order-status',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnB2dXdlZnFmZHF4c2NucXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzExMzIsImV4cCI6MjA4MjUwNzEzMn0.Ogf4LMG2rbDLeSmm2AnkXpZOICeH3HomM5NceTmf4uk"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);