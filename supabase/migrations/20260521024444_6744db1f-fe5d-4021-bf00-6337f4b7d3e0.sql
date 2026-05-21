
-- =========================
-- AUCTIONS
-- =========================
CREATE TABLE IF NOT EXISTS public.auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  starting_price numeric NOT NULL DEFAULT 0,
  current_bid numeric NOT NULL DEFAULT 0,
  current_bidder_id uuid,
  bid_increment numeric NOT NULL DEFAULT 1,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active | ended | cancelled
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction ON public.auction_bids(auction_id, created_at DESC);

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

-- Auctions: public read, admin write
DROP POLICY IF EXISTS "Anyone can view auctions" ON public.auctions;
CREATE POLICY "Anyone can view auctions" ON public.auctions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage auctions" ON public.auctions;
CREATE POLICY "Admins manage auctions" ON public.auctions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bids: public read, authenticated insert (validated by trigger)
DROP POLICY IF EXISTS "Anyone can view bids" ON public.auction_bids;
CREATE POLICY "Anyone can view bids" ON public.auction_bids FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can place own bids" ON public.auction_bids;
CREATE POLICY "Users can place own bids" ON public.auction_bids
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage bids" ON public.auction_bids;
CREATE POLICY "Admins manage bids" ON public.auction_bids
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_auctions_updated_at ON public.auctions;
CREATE TRIGGER trg_auctions_updated_at
BEFORE UPDATE ON public.auctions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bid validation + auto-update of auction current_bid
CREATE OR REPLACE FUNCTION public.handle_new_bid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.auctions%ROWTYPE;
  min_bid numeric;
BEGIN
  SELECT * INTO a FROM public.auctions WHERE id = NEW.auction_id FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Auction not found'; END IF;
  IF a.status <> 'active' THEN RAISE EXCEPTION 'Auction is not active'; END IF;
  IF a.ends_at <= now() THEN RAISE EXCEPTION 'Auction has ended'; END IF;
  min_bid := GREATEST(a.starting_price, COALESCE(a.current_bid, 0) + COALESCE(a.bid_increment, 1));
  IF NEW.amount < min_bid THEN
    RAISE EXCEPTION 'Bid must be at least %', min_bid;
  END IF;
  UPDATE public.auctions
     SET current_bid = NEW.amount,
         current_bidder_id = NEW.user_id,
         updated_at = now()
   WHERE id = NEW.auction_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_bid ON public.auction_bids;
CREATE TRIGGER trg_handle_new_bid
BEFORE INSERT ON public.auction_bids
FOR EACH ROW EXECUTE FUNCTION public.handle_new_bid();

-- Realtime
ALTER TABLE public.auctions REPLICA IDENTITY FULL;
ALTER TABLE public.auction_bids REPLICA IDENTITY FULL;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_bids';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage bucket for auction images
INSERT INTO storage.buckets (id, name, public)
VALUES ('auction-images', 'auction-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Auction images public read" ON storage.objects;
CREATE POLICY "Auction images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'auction-images');

DROP POLICY IF EXISTS "Admins upload auction images" ON storage.objects;
CREATE POLICY "Admins upload auction images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'auction-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update auction images" ON storage.objects;
CREATE POLICY "Admins update auction images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'auction-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete auction images" ON storage.objects;
CREATE POLICY "Admins delete auction images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'auction-images' AND public.has_role(auth.uid(), 'admin'));

-- =========================
-- LEADERBOARD OVERRIDES
-- =========================
CREATE TABLE IF NOT EXISTS public.leaderboard_overrides (
  user_id uuid PRIMARY KEY,
  manual_rank int,
  hidden boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leaderboard_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads leaderboard overrides" ON public.leaderboard_overrides;
CREATE POLICY "Anyone reads leaderboard overrides" ON public.leaderboard_overrides
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins write leaderboard overrides" ON public.leaderboard_overrides;
CREATE POLICY "Admins write leaderboard overrides" ON public.leaderboard_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_lbo_updated_at ON public.leaderboard_overrides;
CREATE TRIGGER trg_lbo_updated_at
BEFORE UPDATE ON public.leaderboard_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
