-- Add restrictive DELETE policies - only admins can delete records

-- Wallets: Only admins can delete wallet records
CREATE POLICY "Only admins can delete wallets"
ON public.wallets
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Orders: Only admins can delete orders
CREATE POLICY "Only admins can delete orders"
ON public.orders
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Coin Transactions: Only admins can delete transactions
CREATE POLICY "Only admins can delete transactions"
ON public.coin_transactions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Profiles: Only admins can delete profiles
CREATE POLICY "Only admins can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));