
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_stackable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_quantity integer NOT NULL DEFAULT 5;
