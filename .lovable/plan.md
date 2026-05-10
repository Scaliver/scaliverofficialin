## Goal

Wrap up the online-payment product flow so it auto-creates the Aluu order on success, and add several admin productivity features around tiers, pricing, reseller pricing, and per-product field visibility.

---

## 1. Pay-Online → Auto Order Fulfillment (verify)

The `chuimei-payment` callback already triggers `aluu-order` for `request_type='product_order'`. We will:

- Audit `ProductDetail.tsx` "Pay Online" path to confirm it inserts an `upi_payment_requests` row with: `request_type='product_order'`, `tier_id`, `provider_product_id`, `player_id`, `zone_id`, `product_id`, `redirect_path`.
- In `chuimei-payment` `handlePaymentCallback`, after marking request `completed`, immediately invoke `aluu-order` `create_order` with the stored tier/player/zone, then create an `orders` row with `status='completed'` (or `pending_manual` on Aluu failure + WhatsApp notify, matching wallet flow).
- On the frontend (`Index.tsx` redirect handler), after verification show a success toast and redirect to `redirect_path` (the product page) instead of staying on `/`.

## 2. Auto-Sort Tiers (no manual sort_order)

- Remove the `Sort Order` input from the admin Tier form in `ProductManagement.tsx`.
- Compute `sort_order` automatically on save by parsing the numeric portion of `amount` (e.g. "86 Diamonds" → 86, "Weekly Pass" → fallback to price). Save = parsed value ascending.
- Backfill existing tiers with a one-shot SQL that recomputes `sort_order` from `amount`/`price`.

## 3. Reseller System

Schema:
- Add `'reseller'` to the `app_role` enum (already may exist — verify; the existing `useReseller` hook uses it).
- New table `reseller_prices(id, tier_id uuid, price numeric, created_at, updated_at)` with unique(tier_id). RLS: admins manage; resellers can SELECT all.

Admin UI:
- New tab "Resellers" in Admin: list users, toggle reseller role on/off (insert/delete `user_roles` row with role='reseller').
- New tab "Reseller Pricing": for each product → list tiers with an editable "Reseller Price" column; saves into `reseller_prices`.

Storefront:
- Extend `useReseller` to also return a `getTierPrice(tier)` helper that returns `reseller_prices.price` if user is reseller and override exists, else falls back to existing percent discount, else `tier.price`.
- Update `ProductDetail.tsx` and `ProductCard.tsx` price displays to use this helper. Order/payment amounts use the same resolved price.

## 4. Tier Picker During Game Import (Aluu)

In `AluuGameManager.tsx`:
- After fetching products for a game, render a checkbox list of all available denoms with their Aluu price.
- On import, only create `pricing_tiers` for selected denoms. Each tier saves `provider_id` (Aluu), `provider_product_id` (denom code), `amount` (denom name), and `price` computed via the USD converter (see #5).

## 5. USD → INR Price Converter

- New site setting key `usd_inr_rate` (default 95). Editable in Admin → Site Settings (numeric input 80–120).
- In tier admin form, add a "USD price" optional input + "Convert" button: sets `price = round(usd * rate)`. Manual override remains editable; we never auto-overwrite an existing price.
- Apply the same conversion automatically during the Aluu game-import in #4 (Aluu prices are USD).

## 6. Per-Product ID / Server Field Toggles

Schema:
- Add `requires_player_id boolean default true` and `requires_server_id boolean default false` to `products`.

Admin:
- Two switches in `ProductManagement.tsx` product form: "Requires Player ID", "Requires Server ID".

Storefront:
- `ProductDetail.tsx`: hide Player ID / Zone ID inputs when respective flag is false; skip validation; pass empty/null to order payload. Aluu `create_order` already accepts optional `serverid`/`charname`.

---

## Technical notes

- DB migration: `app_role` enum check, `reseller_prices` table + RLS, `products.requires_player_id`/`requires_server_id`, `site_settings` seed for `usd_inr_rate`.
- Backfill script: UPDATE `pricing_tiers` SET sort_order = COALESCE(NULLIF(regexp_replace(amount,'[^0-9]','','g'),'')::int, price::int).
- Edge function changes: `chuimei-payment` ensures order row + Aluu create call on product_order verification (tighten existing path).
- Frontend price reads centralized through a new `getEffectivePrice(tier)` in `useReseller` to avoid drift.

## Out of scope (this round)

- Reseller-only catalog visibility filter (resellers will see all products with overridden prices, not a separate catalog).
- Bulk tier import from CSV.
- Multi-currency display toggle for end users.

Confirm and I'll implement, starting with the migration.
