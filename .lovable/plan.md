
# Crypto Wallet (USDT-BEP20) — Build Plan

## 1. Secret update
- Update existing `ALUU_CRYPTO_API_KEY` secret to: `api_216be40dd61dc1739f927c774e2fe0813764ca811a9ae23a` (via update_secret, user re-enters in secure form).
- Old key is replaced; nothing else hard-codes it.

## 2. Database (one migration)
- New table `public.crypto_wallets` — `user_id` (unique), `balance` (numeric USDT, default 0).
- New table `public.crypto_transactions` — `user_id`, `order_id` (Aluu `AGC-...`), `tx_hash`, `amount_usdt`, `amount_inr`, `type` (`topup` / `purchase` / `refund`), `status` (`pending` / `confirming` / `success` / `failed`), `address`, `expires_at`, `notes`, timestamps.
- New table `public.app_settings` (or reuse existing site_settings JSON) — store `usdt_to_inr_rate` (default `100`) and `crypto_enabled` (default `true`). I'll reuse the existing site settings JSONB if present, otherwise add a row.
- RLS:
  - `crypto_wallets`: user can SELECT own row; admin SELECT all; only edge function (service_role) writes.
  - `crypto_transactions`: user SELECT own; admin SELECT/UPDATE all (so admin can flip status); only edge function inserts.
- GRANTs to authenticated + service_role per project rules.
- Auto-create crypto_wallet row on new user via existing `handle_new_user_wallet` trigger (extend it).
- SECURITY DEFINER function `debit_crypto_wallet(user_id, amount_usdt, order_id, description)` — idempotent, atomic, used when paying for a product with USDT.

## 3. Edge function `crypto-gateway`
Single function, action-routed (matches existing project style):
- `action: "create_order"` → POST `https://aluu.in/api/gateway/crypto/create-order` with header `x-api-key`, body `{ amount, webhook_url }`. Insert `crypto_transactions` row (`status=pending`, type=`topup`). Return order details.
- `action: "verify_tx"` → POST `/api/gateway/crypto/verify-tx` with `{ order_id, tx_hash }`. On 200 `credited` → credit `crypto_wallets.balance` (idempotent on order_id), update tx row to `success`, store `amount_paid`/`fee`. On 202 → mark `confirming`. On 4xx → mark `failed` with message.
- `action: "get_balance"` → returns user's crypto_wallets row.
- `action: "purchase"` → for product checkout: validates product, computes USDT amount = `INR_price / usdt_to_inr_rate`, calls `debit_crypto_wallet`, then triggers the existing provider flow (aluu-order / gametopup-order / smm-order / secure-order) the same way wallet payments do today.
- `action: "admin_set_status"` (admin-only via `has_role`) → update tx row + adjust balance on manual success/failed/refund.
- Webhook path (`action: "webhook"`) — Aluu calls back; we update tx + credit balance idempotently.

## 4. Add Coin page — new "Crypto (USDT)" tab
Recreating the screenshots faithfully:
- **Card 1 "Crypto Wallet Top Up"**: current USDT balance + Refresh, BEP20 warning banner, amount input + Create Order.
- **Card 2 "Payment Details"** (after order): Order ID + copy, Pay Exact Amount (USDT, green) + copy, Wallet Amount, Network (BSC), Deposit Address + copy, QR (generated client-side from address — using `qrcode` lib or `qrcode.react`).
- **Card 3** under it: Transaction Hash input + Submit Hash, Payment Status pill (PENDING/CONFIRMING/SUCCESS/FAILED), Expires-in countdown, Refresh Status, Cancel View.
- All buttons wired to `crypto-gateway` edge function; toast feedback; real-time refresh.

## 5. Categories — "USDT Wallet" payment option
- On Product Detail page, alongside the existing wallet/UPI payment options add a "Pay with USDT" button.
- Shows converted USDT amount (`price_inr / rate`) and current USDT balance.
- On click → calls `crypto-gateway purchase` → deducts USDT, creates orders, shows the same TransactionReceipt as before.
- Hidden if `crypto_enabled` is off or balance insufficient (shows top-up CTA).

## 6. Header — wallet balance chip
- Next to "Scaliver Official" logo (desktop + mobile), show authenticated user's INR coin balance with a "+" button linking to `/add-coin`. Compact pill that hides on very narrow screens but stays visible above sm:.
- Uses existing `useWallet` hook.

## 7. Currency selector + Admin rate control
- Small currency dropdown (INR / USDT) in header — toggles display of prices across product cards & detail page via a React context (`CurrencyContext`). Storage in localStorage. Conversion uses the same `usdt_to_inr_rate`.
- Admin panel new tab **"Crypto"**:
  - Edit USDT→INR rate (default 100), enable/disable crypto.
  - Table of all users' crypto wallet balances.
  - Table of all crypto transactions with filters; per-row buttons: **Success**, **Failed**, **Pending** → calls `admin_set_status` (adjusts balance on Success topup).

## 8. SEO / minor
- No SEO regressions; just new internal routes/components.

---

## Files I'll touch
- `supabase/migrations/<new>.sql` — tables, RLS, grants, trigger update, debit function.
- `supabase/functions/crypto-gateway/index.ts` — new edge function.
- `src/hooks/useCryptoWallet.tsx` — new hook (balance + tx realtime).
- `src/contexts/CurrencyContext.tsx` — new currency provider.
- `src/components/CryptoTopUp.tsx` — the 3-card flow on Add Coin.
- `src/components/HeaderWalletChip.tsx` — header balance + plus.
- `src/components/admin/CryptoManagement.tsx` — admin tab.
- Edits: `src/pages/AddCoin.tsx`, `src/pages/ProductDetail.tsx`, `src/components/Header.tsx`, `src/pages/Admin.tsx`, `src/App.tsx` (CurrencyProvider).
- Package: add `qrcode.react` (small, ~3kb) for the deposit QR.

## What I need from you
1. Approve this plan.
2. After approval, I'll trigger the secret update form so you can paste the new key `api_216be40dd61dc1739f927c774e2fe0813764ca811a9ae23a` securely (never stored in code).
3. Then I run the migration (requires your approval too).
4. Then ship all the code above in one pass.

Reply **"go"** to proceed, or tell me what to change.
