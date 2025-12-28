-- Add INSERT policy for wallets table so users can create their own wallet
CREATE POLICY "Users can insert their own wallet"
ON public.wallets
FOR INSERT
WITH CHECK (auth.uid() = user_id);