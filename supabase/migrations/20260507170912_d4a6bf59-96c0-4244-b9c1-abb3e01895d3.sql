
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS game_code text;

CREATE INDEX IF NOT EXISTS idx_products_game_code ON public.products(game_code);
