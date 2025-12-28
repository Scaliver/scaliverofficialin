-- Remove the user UPDATE policy from wallets table to prevent users from modifying their own balance
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;