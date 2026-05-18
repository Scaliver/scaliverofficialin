alter table public.products
  add column if not exists server_mode text not null default 'manual',
  add column if not exists server_options jsonb not null default '[]'::jsonb,
  add column if not exists requires_char_name boolean not null default false;

create unique index if not exists categories_name_unique_idx
  on public.categories (lower(name));

create unique index if not exists products_slug_unique_idx
  on public.products (lower(slug))
  where slug is not null and btrim(slug) <> '';

create unique index if not exists pricing_tiers_provider_product_unique_idx
  on public.pricing_tiers (product_id, provider_product_id)
  where provider_product_id is not null;