
-- 1. audit_logs: only admins can insert (edge functions use service_role and bypass RLS)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid());

-- 2. coin_transactions: remove user-self INSERT; only admins/server roles may write
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.coin_transactions;

-- 3. phone_verifications: drop public INSERT/UPDATE; edge function uses service_role
DROP POLICY IF EXISTS "System can insert verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "System can update verifications" ON public.phone_verifications;

-- 4. upi_payment_requests: require authentication and ownership
DROP POLICY IF EXISTS "Anyone can insert UPI requests" ON public.upi_payment_requests;
CREATE POLICY "Authenticated users can insert own UPI requests" ON public.upi_payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. user_contacts: drop public INSERT; handle_new_user trigger is SECURITY DEFINER and bypasses RLS
DROP POLICY IF EXISTS "System can insert contacts" ON public.user_contacts;
CREATE POLICY "Users can insert their own contact" ON public.user_contacts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. auction_bids: restrict SELECT to authenticated users (hide user_id from anon)
DROP POLICY IF EXISTS "Anyone can view bids" ON public.auction_bids;
CREATE POLICY "Authenticated users can view bids" ON public.auction_bids
  FOR SELECT TO authenticated USING (true);

-- 7. leaderboard_overrides: only non-hidden rows are public
DROP POLICY IF EXISTS "Anyone reads leaderboard overrides" ON public.leaderboard_overrides;
CREATE POLICY "Anyone reads non-hidden leaderboard overrides" ON public.leaderboard_overrides
  FOR SELECT USING (hidden IS NOT TRUE);

-- 8. Realtime: remove financial/order tables from public realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.wallets;
ALTER PUBLICATION supabase_realtime DROP TABLE public.coin_transactions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
ALTER PUBLICATION supabase_realtime DROP TABLE public.upi_payment_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE public.crypto_orders;
ALTER PUBLICATION supabase_realtime DROP TABLE public.crypto_wallets;
ALTER PUBLICATION supabase_realtime DROP TABLE public.crypto_deposit_logs;
