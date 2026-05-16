## Goal

Make UPI payments end-to-end automatic for both **wallet recharge** and **tier/product purchase**, with independent admin toggles, correct redirects, idempotent webhooks, automatic Aluu order creation only after payment success, complete order history, and automatic status sync.

## Webhook URL to set in Chuimei dashboard

```
https://rhfpvuwefqfdqxscnquf.supabase.co/functions/v1/chuimei-payment
```
(same URL handles both POST webhook and GET browser redirect)

## 1. Two separate UPI systems with separate admin toggles

**Database (`site_settings`)** — add new keys via `supabase--insert`:
- `upi_wallet_enabled` → `{ enabled: true }`  (controls Pay UPI on `/add-coin`)
- `upi_product_enabled` → `{ enabled: true }` (controls Pay UPI on Product pages)
- (deprecate existing `upi_payment_enabled` — keep reading it as fallback for safety)

**`src/components/admin/SiteSettings.tsx`** — replace single switch with two switches: "Wallet UPI Payment" and "Tier/Product UPI Payment".

**`src/pages/AddCoin.tsx`** — read `upi_wallet_enabled` only.
**`src/pages/ProductDetail.tsx`** — read `upi_product_enabled` only.

## 2. Tier / Product UPI flow

Already wired but tightened:

```text
ProductDetail
  → insert upi_payment_requests (request_type='product_order', redirect_path=<origin>/orders)
  → invoke chuimei-payment create_order
  → window.open(payment_url)
  → user pays on Chuimei
  → Chuimei POST webhook  ─┐
  → Chuimei GET redirect ──┴─→ chuimei-payment edge fn
      verify with /check-order-status
      handlePaymentCallback() → fulfillProductOrder()
        - create row in `orders` (idempotent via unique index on payment_request_id)
        - invoke aluu-order with game/denom/userid/serverid/charname/partner_orderid + webhook
        - fetch immediate status; store smm_order_id
      GET redirect → <origin>/orders?payment_order=...
  → Orders page poller calls verify_payment as final safety net
```

Changes:
- `ProductDetail.tsx`: change `redirect_path` from `/product-detect` to `${origin}/orders` so the redirect lands on the real history page. Remove the `/product-detect` route.
- `chuimei-payment/index.ts`: in the GET-callback redirect branch, for `request_type='product_order'` ALWAYS use `/orders` (success or fail) — no more redirecting product purchases to `/add-coin` on failure.
- Keep existing unique index on `orders.payment_request_id` (added in earlier migration) for idempotency.
- Confirm `fulfillProductOrder` only runs from the success branch (already true — runs after `existingReq.status !== 'completed'` and `isSuccess`).

## 3. Wallet UPI flow

- `AddCoin.tsx`: pass `redirect_path: \`${window.location.origin}/wallet\`` when inserting `upi_payment_requests` (currently missing), and on success redirect to `/wallet` (already done client-side).
- `chuimei-payment` GET branch: for `request_type='coin_recharge'` success → `/wallet`, fail → `/add-coin` (already correct).

## 4. Order history fix

The orders only appear if `fulfillProductOrder` runs. Add a safety net: when the user lands on `/orders?payment_order=<id>`, the page should call `chuimei-payment` with `action: 'verify_payment'` and poll until `has_order: true` or 60s. Then refetch orders. (Most of this exists in `Orders.tsx` from prior work — verify and tighten.)

Also include the Aluu reference: `Orders.tsx` already shows `smm_order_id` as "Provider Order ID" — confirm visible.

## 5. Wallet-coin product purchase (existing handleWalletPayment)

Already creates order + invokes aluu-order via `secure-order` / `process_order_payment`. Verify it:
- deducts via `process_order_payment` RPC (idempotent)
- inserts order row
- invokes `aluu-order` create_order
- redirects to `/orders`

If anything missing, align it with the post-UPI `fulfillProductOrder` logic so both paths behave identically.

## 6. Automatic Aluu status sync (every 1 min)

Edge function `sync-order-status` already exists. Schedule it via `pg_cron` + `pg_net` using `supabase--insert` (not migration, since it contains the anon key):

```sql
select cron.schedule(
  'sync-aluu-orders-every-minute',
  '* * * * *',
  $$ select net.http_post(
       url := 'https://rhfpvuwefqfdqxscnquf.supabase.co/functions/v1/sync-order-status',
       headers := '{"Content-Type":"application/json","apikey":"<ANON_KEY>"}'::jsonb,
       body := '{}'::jsonb
     ); $$
);
```

`sync-order-status` iterates `orders` with status in (`pending`,`processing`) and calls Aluu `get_order` per order to map status → completed / failed / refunded, and refunds wallet on failure (idempotent via existing status check).

## 7. Cleanup

- Remove `/product-detect` route + handler in `App.tsx` (no longer needed).
- Confirm Admin dashboard has no remaining manual UPI approval UI (already removed in earlier turn).
- Remove the legacy WhatsApp manual fallback path on UPI orders (Aluu auto-flow only).

## Files touched

- `supabase/migrations/<new>.sql` — none needed (idempotency index already exists).
- `supabase/functions/chuimei-payment/index.ts` — GET-redirect for `product_order` always → `/orders`.
- `supabase/functions/sync-order-status/index.ts` — verify it covers Aluu (read & adjust if needed).
- `src/components/admin/SiteSettings.tsx` — two UPI toggles.
- `src/pages/AddCoin.tsx` — read `upi_wallet_enabled`, set `redirect_path`.
- `src/pages/ProductDetail.tsx` — read `upi_product_enabled`, set `redirect_path` to `/orders`.
- `src/pages/Orders.tsx` — verify polling + display of Aluu reference.
- `src/App.tsx` — remove `/product-detect` route.
- `supabase--insert` calls — site_settings rows + cron job.

## Out of scope (not in this plan)

- New SEO/banner/trending sections (separate request).
- Visual redesign.

Approve and I'll implement.