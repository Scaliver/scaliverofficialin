
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.upi_payment_requests ADD COLUMN IF NOT EXISTS auction_id uuid;
CREATE INDEX IF NOT EXISTS idx_upi_payment_requests_auction_id ON public.upi_payment_requests(auction_id);
