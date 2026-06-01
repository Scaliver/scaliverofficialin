-- Site alerts: image, redirect, CTA button
ALTER TABLE public.site_alerts
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS redirect_url text,
  ADD COLUMN IF NOT EXISTS cta_label text NOT NULL DEFAULT 'Join Now';

-- Orders: persist verified player name
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS player_name text;
ALTER TABLE public.upi_payment_requests ADD COLUMN IF NOT EXISTS player_name text;

-- Storage bucket for alert images (reuse banners is fine, but make new dedicated one)
INSERT INTO storage.buckets (id, name, public)
VALUES ('alerts', 'alerts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view alert images"
ON storage.objects FOR SELECT
USING (bucket_id = 'alerts');

CREATE POLICY "Admins can upload alert images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'alerts' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update alert images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'alerts' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete alert images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'alerts' AND has_role(auth.uid(), 'admin'::app_role));

-- Admin-callable RPC: manually credit USDT to a user (creates an audit-ready crypto_orders row)
CREATE OR REPLACE FUNCTION public.admin_credit_crypto_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ref text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  v_ref := 'ADMIN-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);

  INSERT INTO public.crypto_orders (
    user_id, order_reference, request_type, amount, currency, network,
    status, credited, notes, metadata
  ) VALUES (
    p_user_id, v_ref, 'admin_credit', p_amount, 'USDT', 'MANUAL',
    'success', true, COALESCE(p_note, 'Manual admin credit'),
    jsonb_build_object('admin_id', auth.uid())
  );

  INSERT INTO public.crypto_wallets (user_id, balance) VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.crypto_wallets
     SET balance = balance + p_amount, updated_at = now()
   WHERE user_id = p_user_id;

  INSERT INTO public.audit_logs (admin_id, action, resource_type, details)
  VALUES (auth.uid(), 'admin_manual_crypto_credit', 'crypto_wallets',
          jsonb_build_object('user_id', p_user_id, 'amount', p_amount, 'note', p_note, 'ref', v_ref));

  RETURN jsonb_build_object('success', true, 'reference', v_ref);
END;
$$;