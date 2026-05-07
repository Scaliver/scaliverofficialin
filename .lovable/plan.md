## Plan: Replace SmileOne with Aluu.in Provider

### What gets removed
- Delete `supabase/functions/smilecode-order/` edge function
- Delete `src/components/admin/SmileCodeAutoFetcher.tsx` and `MLBBAutoLinker.tsx`
- Remove SmileOne UI references from `ProductManagement.tsx` and `ApiManagement.tsx`
- Delete secrets: `SMILECODE_API_KEY`, `SMILECODE_UID`, `SMILECODE_SECRET_KEY`
- Remove `smm_apis` rows where `api_type = 'smilecode'`
- Clear `provider_id` / `provider_product_id` on tiers linked to old SmileOne provider

### What gets added

**Secrets** (via add_secret tool — never paste in chat):
- `ALUU_API_KEY`
- `ALUU_SECRET_KEY` (for HMAC webhook verification)

> ⚠️ You pasted your API key in chat. Treat it as compromised — rotate it on aluu.in before we save the new one.

**Database**
- Add `'aluu'` as supported `api_type` in `smm_apis`
- Insert one active Aluu provider row
- Reuse existing `pricing_tiers.provider_id` + `provider_product_id` (will store Aluu `gamecode` + `denom` Pack code)
- Add optional `server_id` / `char_name` columns to `orders` if not present (for games needing them)

**Edge functions**
- New `aluu-order/index.ts` — actions: `games`, `products`, `server_options`, `create_order`, `track_order`
- New `aluu-webhook/index.ts` (`verify_jwt = false`) — receives final status callbacks, verifies HMAC-SHA256, marks order completed/failed, refunds wallet on failure

**Admin UI (new tab "Game Codes")**
- New `src/components/admin/AluuGameManager.tsx`:
  - "Fetch Games from Aluu" button → lists all games + counts
  - Click a game → fetch products (denoms) → table with Pack, name, price, requiresUserId/ServerId/CharName, stockStatus
  - "Auto-Link to Pricing Tiers" — match by Pack/denom and write `provider_product_id` = `gamecode:denom`
  - Per-row "Edit" → manually map a tier to a specific Aluu denom
  - Per-game server-options preview

**Order flow update**
- `ProductDetail.tsx` → when tier provider is Aluu, call `aluu-order` `create_order` with `partner_orderid = orders.id`, `partner_webhook_url = <project>/functions/v1/aluu-webhook`
- Mark order `processing`; webhook flips to `completed` or `failed`
- On `failed`, auto-refund wallet (existing pattern)

### Technical notes
- Aluu auth header: `x-api-key`
- Webhook signature: `hex(hmac_sha256(secret, timestamp + "." + rawBody))` — verify with `X-Webhook-Timestamp` + `X-Webhook-Signature`
- `partner_orderid` will be the Supabase `orders.id` (UUID, unique)
- Server/char fields passed conditionally per game requirements

### Order of execution
1. Migration: add `'aluu'` to allowed api_types, clean SmileOne data
2. Add `ALUU_API_KEY` + `ALUU_SECRET_KEY` secrets
3. Delete old files + deploy delete for `smilecode-order`
4. Create `aluu-order` + `aluu-webhook` functions, update `config.toml`
5. Build `AluuGameManager.tsx` admin tab
6. Update `ProductDetail.tsx` order routing
7. Test: fetch games → link a tier → place a test order → verify webhook
