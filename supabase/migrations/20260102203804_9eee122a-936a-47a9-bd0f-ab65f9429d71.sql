-- Create UPI payment requests table
CREATE TABLE public.upi_payment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  request_type TEXT NOT NULL DEFAULT 'coin_recharge', -- 'coin_recharge' or 'product_order'
  amount NUMERIC NOT NULL,
  total_coins NUMERIC, -- For coin recharge
  bonus_coins NUMERIC DEFAULT 0, -- For coin recharge
  product_name TEXT, -- For product orders
  product_pack TEXT, -- For product orders
  player_id TEXT, -- For product orders
  zone_id TEXT, -- For product orders
  utr_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upi_payment_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can view all UPI requests" 
ON public.upi_payment_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update UPI requests" 
ON public.upi_payment_requests 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete UPI requests" 
ON public.upi_payment_requests 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert UPI requests" 
ON public.upi_payment_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own requests" 
ON public.upi_payment_requests 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_upi_payment_requests_updated_at
BEFORE UPDATE ON public.upi_payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.upi_payment_requests;