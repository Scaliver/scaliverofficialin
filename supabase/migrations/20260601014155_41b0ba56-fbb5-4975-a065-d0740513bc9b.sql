ALTER TABLE public.crypto_wallets REPLICA IDENTITY FULL;
ALTER TABLE public.crypto_orders REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;