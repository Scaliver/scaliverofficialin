-- Add phone_verified column to user_contacts
ALTER TABLE public.user_contacts ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

-- Create phone_verifications table for OTP tracking
CREATE TABLE public.phone_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  phone text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Only system/edge functions can manage verifications (public insert for the edge function)
CREATE POLICY "System can insert verifications"
ON public.phone_verifications
FOR INSERT
WITH CHECK (true);

-- Only admins can view verifications
CREATE POLICY "Admins can view verifications"
ON public.phone_verifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can update verifications
CREATE POLICY "System can update verifications"
ON public.phone_verifications
FOR UPDATE
USING (true);

-- Only admins can delete verifications
CREATE POLICY "Only admins can delete verifications"
ON public.phone_verifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_phone_verifications_phone_otp ON public.phone_verifications(phone, otp_code);
CREATE INDEX idx_phone_verifications_expires ON public.phone_verifications(expires_at);