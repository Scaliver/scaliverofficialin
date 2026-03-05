
Goal: stop repeated setup prompts and make MLBB orders auto-work using Matrix items (including a 3-diamond test option).

What I verified
- Current failure is real: `digital-topup` returns `Cannot POST /proxy/proxy` (HTTP 404).
- Root cause: proxy URL is being double-suffixed with `/proxy`.
- Only 1 MLBB tier is linked to digital-topup (`3 Diamonds`), so most MLBB packs cannot auto-fulfill yet.
- Frontend already made username verification optional, but backend still does strict pre-check before order.

Implementation plan

1) Make proxy handling self-healing (no more repeated asking)
- Update `supabase/functions/digital-topup/index.ts` to normalize `MATRIX_PROXY_URL`:
  - remove trailing slash
  - remove trailing `/proxy` if present
  - always call `${normalizedBase}/proxy`
- Add clear error logging for resolved proxy URL path.

2) Make auto-order work without mandatory username check
- In `digital-topup` `create_order` flow:
  - keep `check_id` as best-effort (for nickname/validation),
  - if check fails, still attempt `create_order` (instead of hard-failing),
  - only downgrade to `pending_manual` if actual `create_order` fails.
- This ensures recharge can proceed even when username lookup is unreliable.

3) Fetch and use full Matrix MLBB item list
- In `src/pages/ProductDetail.tsx`:
  - for Mobile Legends + digital-topup, fetch `product_items` for `mlbb-global`,
  - build selectable tiers from returned items (`id`, `name`, `price`),
  - show diamond labels from item names (e.g., `5`, `12`, `19` -> `5 Diamonds`, etc.).
- Keep existing DB tiers as fallback if API fetch fails.

4) Add explicit “3 Diamonds” test option
- Keep/insert a pinned test tier at top (`3 Diamonds`) for quick validation.
- Map this test option to a known item id for pipeline verification (non-production test flag in UI label so it’s clearly marked).

5) Ensure automatic routing always triggers
- In `ProductDetail` order submit path, route MLBB digital-topup orders even when local tier `provider_id` is missing by using fetched Matrix `item_id`.
- Keep existing provider-based logic for other categories/providers unchanged.

6) Verification checklist
- API connection test in admin should return success (no `/proxy/proxy`).
- Place MLBB order in automatic mode without manual username verify.
- Confirm order gets external order id and status `processing` (not `pending_manual`).
- Run 3-diamond test flow end-to-end and verify order creation + wallet debit + receipt.
