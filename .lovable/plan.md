

# Replace Matrix Sols with SmileOne SmileCode API

## Summary
Remove the Matrix Sols / digital-topup integration entirely and replace it with SmileOne's SmileCode API for MLBB and other game top-ups. No proxy server needed -- SmileOne is called directly via JWT-authenticated requests.

## SmileOne API Architecture
- **Base URL**: `https://www.smile.one/smilecode/api/`
- **Auth**: JWT (HS256) with headers `Sc-Api-Key`, `Sc-Api-Version: 2.0`, `Authorization: Bearer <jwt>`
- **JWT payload** = the request body (includes `jsonrpc`, `id`, `method`, `params`)
- **JWT header** includes `sc-api-key` and `sc-api-version`
- **Signing key** = the secret key provided by SmileOne
- **Methods**: `productList`, `skuList`, `validate`, `sendOrder`, `orderDetail`, `balance`

## Secrets to Store
| Secret Name | Value | Purpose |
|---|---|---|
| `SMILECODE_API_KEY` | `chuimeikamei58@gmail.com` | Sc-Api-Key header |
| `SMILECODE_UID` | `2379472` | Client ID (encoded in JWT, not exposed in header) |
| `SMILECODE_SECRET_KEY` | `b37dedd9f488df0ff45bf344d0d83bd7` | JWT signing key |

## Implementation Steps

### 1. Store SmileOne secrets
Add three secrets via the `add_secret` tool.

### 2. Create new edge function `smilecode-order/index.ts`
Replace `digital-topup`. Supports these actions:
- **`balance`** → calls SmileOne `balance` method
- **`products`** → calls `productList`
- **`sku_list`** → calls `skuList` with `apiGame` param
- **`validate`** → calls `validate` with `apiGame`, `user_id`, `server_id`
- **`send_order`** → calls `sendOrder` with `apiGame`, SKU, qty, user account; saves order to DB
- **`order_detail`** → calls `orderDetail` with `orderId`

JWT generation in Deno using `djwt` library:
```text
header = { alg: "HS256", typ: "JWT", "sc-api-key": apiKey, "sc-api-version": "2.0" }
payload = { jsonrpc: "2.0", id: requestId, method: "...", params: { iat, ... } }
sign with SMILECODE_SECRET_KEY
```

### 3. Delete `digital-topup` edge function
Remove `supabase/functions/digital-topup/index.ts`.

### 4. Update database — smm_apis entry
- Update the existing "Matrix Sols" row in `smm_apis` to become "SmileOne" with `api_type = 'smilecode'`
- Or insert a new "SmileOne" entry and update pricing tiers to reference it

### 5. Update pricing tiers
- Update MLBB pricing tiers' `provider_product_id` values from Matrix item IDs to SmileOne SKU IDs (will need to fetch SKU list first, or user provides mapping)
- The `provider_id` will point to the new SmileOne `smm_apis` entry

### 6. Update `ProductDetail.tsx`
- Replace all `digital-topup` function invocations with `smilecode-order`
- For MLBB orders: call `smilecode-order` with `action: 'send_order'`, `apiGame` (from product config), `sku`, `user_id`, `server_id`
- For player verification: call `smilecode-order` with `action: 'validate'`
- Remove Matrix-specific logic (`mlbb-global` product ID, proxy references)
- Fix the `NodeJS` namespace TypeScript error on line 118

### 7. Update `Admin.tsx`
- Replace any `digital-topup` references in the admin fulfillment flow with `smilecode-order`
- Update the API connection test to use SmileOne balance check

### 8. Remove Matrix-related secrets
- `MATRIX_API_KEY`, `MATRIX_CLIENT_ID`, `MATRIX_PROXY_URL` are no longer needed (can be left, just unused)

## Technical Details — JWT Construction (Deno)
```text
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts"

const header = { alg: "HS256", typ: "JWT", "sc-api-key": apiKey, "sc-api-version": "2.0" }
const payload = { jsonrpc: "2.0", id: requestId, method, params: { iat: Math.floor(Date.now()/1000), ...params } }
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secretKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
const token = await create(header, payload, key)

// Then POST to https://www.smile.one/smilecode/api/ with:
// Headers: { "Sc-Api-Key": apiKey, "Sc-Api-Version": "2.0", "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
// Body: payload (same as JWT payload)
```

