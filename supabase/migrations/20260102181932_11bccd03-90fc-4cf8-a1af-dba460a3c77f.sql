-- Create site_alerts table for admin-managed alerts
CREATE TABLE public.site_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Important Notice',
  message text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  alert_type text NOT NULL DEFAULT 'info',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.site_alerts ENABLE ROW LEVEL SECURITY;

-- Anyone can view active alerts (public read for active ones)
CREATE POLICY "Anyone can view active alerts" ON public.site_alerts
  FOR SELECT USING (is_active = true);

-- Admins can view all alerts
CREATE POLICY "Admins can view all alerts" ON public.site_alerts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert alerts
CREATE POLICY "Admins can insert alerts" ON public.site_alerts
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update alerts
CREATE POLICY "Admins can update alerts" ON public.site_alerts
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete alerts
CREATE POLICY "Admins can delete alerts" ON public.site_alerts
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_site_alerts_updated_at
  BEFORE UPDATE ON public.site_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();