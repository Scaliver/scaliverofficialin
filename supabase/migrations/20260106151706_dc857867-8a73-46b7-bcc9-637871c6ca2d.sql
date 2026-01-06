-- Create table for SMM API configurations
CREATE TABLE public.smm_apis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smm_apis ENABLE ROW LEVEL SECURITY;

-- Only admins can manage API configurations
CREATE POLICY "Admins can view SMM APIs"
ON public.smm_apis
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert SMM APIs"
ON public.smm_apis
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update SMM APIs"
ON public.smm_apis
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete SMM APIs"
ON public.smm_apis
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_smm_apis_updated_at
BEFORE UPDATE ON public.smm_apis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();