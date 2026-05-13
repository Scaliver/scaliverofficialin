## Goal

Eliminate every manual payment path, make UPI gateway purchases automatically fulfill via Aluu.in, replace the hard-coded coin bonuses with an admin-editable table, and add a Redeem Code system (admin generates codes, users redeem them, history visible to both).

---

## 1. Remove manual flows

**Product page (`src/pages/ProductDetail.tsx`)**
- Delete the "Pay with UPI QR" button and the entire `showUpiPayment` block (`handleUPIPayment`, `handleSubmitUPIPayment`, UTR input, QR image).
- Keep only **Pay with Coins** + **Pay UPI** (gateway) buttons.

**Add Coin (`src/pages/AddCoin.tsx`)**
- Remove the "UPI QR" payment-method tile, `handleSubmitPayment` (UTR submit), UTR input, QR image, `paymentMethod` toggle.
- Always go straight to gateway flow (`handleChuimeiPayment`).

**Admin (`src/pages/Admin.tsx`)**
- Remove the "Pending Manual" tab + its filtered orders panel.
- Drop `pending_manual` from the status `<Select>` filter.

**SiteSettings (`src/components/admin/SiteSettings.tsx`)**
- (already mostly clean) leave as-is; reseller controls stay.

---

## 2. Auto-fulfill UPI gateway product orders via Aluu

The webhook + `verify_payment` already calls `fulfillProductOrder`, which inserts the order and invokes `aluu-order`. Two fixes:

- **Rename "manual fallback" path:** when Aluu/GameTopUp call fails inside `fulfillProductOrder`, mark the order `failed` instead of `pending_manual` (since manual is removed). Refund the user by inserting a credit `coin_transactions` row only if a debit was recorded — but for gateway flow no wallet debit exists, so just mark failed and log.
- **Trigger fulfillment immediately on `create_order`** in `chuimei-payment`: today fulfillment only runs on webhook/verify_payment. After we return the gateway URL we still rely on the webhook — keep that, but also start a short `verify_payment` poll on the client-side `Orders.tsx` (already in place). No structural change needed beyond the failed-instead-of-pending_manual update.

---

## 3. Editable Coin Bonuses

**New table `coin_packages`**
```
id uuid pk, amount numeric not null, bonus numeric not null default 0,
sort_order int default 0, is_active bool default true, timestamps
```
RLS: anyone can view active rows; only admins insert/update/delete. Seed with the current 7 packages.

**AddCoin.tsx**: fetch active packages from DB instead of `coinPackages` constant. Drop the `getBonus()` ladder for custom amounts — custom amount gets **no** bonus (bonus only applies to fixed packages).

**Admin.tsx**: new tab **"Coin Packages"** with a simple list — amount, bonus, active toggle, edit/delete + add-row.

---

## 4. Redeem Code system

**Tables**
```
redeem_codes:
  id uuid pk, code text unique not null, coins numeric not null,
  max_uses int default 1, used_count int default 0,
  expires_at timestamptz null, is_active bool default true,
  created_by uuid, created_at, updated_at

redeem_code_redemptions:
  id uuid pk, code_id uuid not null, user_id uuid not null,
  coins_credited numeric not null, redeemed_at timestamptz default now(),
  unique(code_id, user_id)
```

RLS:
- `redeem_codes`: admins full CRUD; users can SELECT only `is_active=true` rows (needed for client-side existence check) — actually safer: no client SELECT; redemption goes through a SECURITY DEFINER function `redeem_code(_code text)` that returns coins credited.
- `redeem_code_redemptions`: users can SELECT their own; admins SELECT all; inserts only via the function.

**Function `public.redeem_code(_code text)`** (SECURITY DEFINER):
- look up active, non-expired code with `used_count < max_uses`
- ensure `(code_id, auth.uid())` not yet redeemed
- credit wallet, insert `coin_transactions` (type credit, description `Redeemed code XXX`), insert `redeem_code_redemptions`, increment `used_count`
- return `{ success, coins, message }`

**UI**
- New page `src/pages/Redeem.tsx`: input code → call RPC → toast result; show user's redemption history below.
- `src/components/QuickActions.tsx`: replace **History** with **Redeem** (Gift icon, route `/redeem`); History stays accessible from wallet page.
  *(Or add as a 5th tile — keeping 4 columns. Choose: replace History since History page already lives under wallet/orders.)*
- `src/App.tsx`: add `/redeem` route.
- Admin tab **"Redeem Codes"**: generate single or bulk codes (count + coin amount + max uses + expiry), list all codes with usage stats, deactivate/delete, and a redemptions table showing who redeemed what.

---

## Files touched

- `supabase/migrations/<new>.sql` — coin_packages, redeem_codes, redeem_code_redemptions, `redeem_code` function, seed
- `supabase/functions/chuimei-payment/index.ts` — pending_manual → failed
- `src/pages/AddCoin.tsx` — drop manual UPI + load packages from DB
- `src/pages/ProductDetail.tsx` — drop UPI QR button + handlers
- `src/pages/Admin.tsx` — remove Pending Manual tab; add Coin Packages tab; add Redeem Codes tab
- `src/components/QuickActions.tsx` — Redeem tile
- `src/pages/Redeem.tsx` (new)
- `src/App.tsx` — register `/redeem`
- `src/components/admin/CoinPackageManagement.tsx` (new)
- `src/components/admin/RedeemCodeManagement.tsx` (new)

## Out of scope
- Reseller pricing changes
- Refactor of Aluu webhook signature verification
- Refunding wallet on gateway failure (no wallet was debited)