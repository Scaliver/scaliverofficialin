-- Create secure user_contacts table for sensitive info (admin-only access)
CREATE TABLE public.user_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;

-- Only admins can view contact info
CREATE POLICY "Only admins can view contacts"
ON public.user_contacts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update contact info
CREATE POLICY "Only admins can update contacts"
ON public.user_contacts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete contact info
CREATE POLICY "Only admins can delete contacts"
ON public.user_contacts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert contacts (via trigger)
CREATE POLICY "System can insert contacts"
ON public.user_contacts
FOR INSERT
WITH CHECK (true);

-- Migrate existing phone/address data from profiles
INSERT INTO public.user_contacts (user_id, phone, address)
SELECT id, phone, address FROM public.profiles
WHERE phone IS NOT NULL OR address IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Update trigger to store phone in user_contacts instead of profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'display_name'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Store phone in secure contacts table
  IF NEW.raw_user_meta_data ->> 'phone' IS NOT NULL THEN
    INSERT INTO public.user_contacts (user_id, phone)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'phone');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_user_contacts_updated_at
BEFORE UPDATE ON public.user_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remove phone and address columns from profiles (after data migration)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS address;