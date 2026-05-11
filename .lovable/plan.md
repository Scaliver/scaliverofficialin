## Plan

### 1. Remove manual recharge (product side)
- `ProductDetail.tsx`: delete the Recharge Mode selector block (lines ~776-816), remove `rechargeMode` state, `isManualRechargeEnabled` fetch, and the `if (rechargeMode === 'manual')` branch in the wallet purchase flow. All wallet purchases go through automatic Aluu/GameTopUp fulfillment.
- `SiteSettings.tsx`: remove the "Manual Recharge Mode" toggle UI (keep the DB key untouched — harmless).
- Keep the `pending_manual` order status as a *fallback* only when an automated provider call fails (existing behavior in chuimei callback already does this).

### 2. Rename "Pay Online" → "Pay UPI"
- `ProductDetail.tsx` line 1147: change button label `Pay Online` → `Pay UPI`. Update icon/toast copy ("Payment Initiated" stays).
- The existing "Pay with UPI QR" (manual UTR) button stays renamed to **"Pay UPI (Manual QR)"** to avoid confusion, OR is removed if you want only the gateway flow. (Default in plan: keep both, rename QR variant.)
- `AddCoin.tsx` line 419 & 439: also rename "Pay Online" → "Pay UPI" for consistency.

### 3. Instant 24/7 product purchase via Pay UPI → Aluu auto-order
Already wired end-to-end; this step just verifies/locks it in:
- On click: insert `upi_payment_requests` with `request_type='product_order'`, `tier_id`, `provider_id`, `provider_product_id`, `player_id`, `zone_id`, `redirect_path`. ✅ already done.
- `chuimei-payment` GET callback + `verify_payment` action calls `handlePaymentCallback` → `fulfillProductOrder` → invokes `aluu-order` `create_order` automatically. ✅ already done.
- Add `redirect_path` default to `/orders` (instead of category page) so user lands on order history right after payment.
- Add a polling effect on `/orders` (and existing one on `/`) that calls `verify_payment` for any `?payment_order=...` URL param and shows a success toast.

### 4. Order + history row creation after gateway payment
- `fulfillProductOrder` already inserts an `orders` row (status `processing` on success, `pending_manual` on failure). ✅
- Also insert a `coin_transactions` row of type `debit` referencing the order so it shows up in the user's wallet history. (New: currently only wallet-based purchases create that row via `process_order_payment`.)

### 5. Auto-sort pricing tiers (small → high) by amount
- `ProductManagement.tsx`: add an **"Auto-Sort Tiers"** button next to each product's tier list.
- Logic: read all `pricing_tiers` for that product, parse the leading integer from `amount` (e.g. "5 Diamonds" → 5, "10000 Diamonds" → 10000), sort ascending, then `update` `sort_order = index` for each tier.
- Tier list rendering already orders by `sort_order`, so it will reflect immediately.
- Optional: also run this automatically on tier insert/edit (already partially wired — confirm and unify).

### 6. Webhook + payment-detection hardening for Pay UPI
- Add a dedicated POST webhook action `chuimei_webhook` (no JWT) at `/functions/v1/chuimei-payment` (already supported via `case 'callback'`). Provide a stable webhook URL the user can paste into the Chuimei-pe dashboard:
  ```
  https://rhfpvuwefqfdqxscnquf.supabase.co/functions/v1/chuimei-payment
  ```
  This same endpoint handles GET redirect *and* POST webhook.
- Improve verify logic:
  - Accept more status synonyms (`paid`, `complete`, `Success`, numeric `1`).
  - Always run `verify_payment` against Chuimei `/check-order-status` even if callback says success (source of truth).
  - Idempotency guard via `existingReq.status === 'completed'` is already present. ✅
- Frontend:
  - On redirect back, poll `verify_payment` every 3s up to 60s on `/orders` and `/` for `?payment_order=...`. On `completed` → toast + refresh orders list.
- Failure path: if Aluu call fails, mark order `pending_manual` and notify admin via WhatsApp (already implemented in `fulfillProductOrder` partial; will add WhatsApp ping using existing `send-payment-notification` style helper).

### Out of scope
- Reseller pricing changes
- New payment providers
- Refactor of Aluu webhook signature verification

### Technical files touched
- `src/pages/ProductDetail.tsx` — remove manual mode UI/logic, rename button, default redirect to `/orders`
- `src/pages/AddCoin.tsx` — rename label
- `src/pages/Index.tsx` / `src/pages/Orders.tsx` — payment_order polling
- `src/components/admin/ProductManagement.tsx` — Auto-Sort Tiers button
- `src/components/admin/SiteSettings.tsx` — remove manual recharge toggle
- `supabase/functions/chuimei-payment/index.ts` — broader status parsing, debit transaction insert on product_order success, webhook hardening
