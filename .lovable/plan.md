

## Plan: Link All Products to SmileOne for Auto-Fulfillment

### Current State
- **SmileOne provider ID**: `46348dcb-0538-4e1f-ade6-c4670e6e0808`
- **MLBB SMALL PACK**: Already linked to SmileOne (SKUs: 382, 383, 384, 385, etc.)
- **MLBB MID PACK, LARGE PACK, DOUBLE DIAMONDS**: NOT linked (no `provider_id` set)
- **BGMI, Genshin, Honour of Kings**: NOT linked
- **MLBB BRAZIL**: Product does NOT exist yet - needs to be created based on your screenshot
- **STARLIGHT CARD, WEEKLY DIAMOND PASS**: Exist but need SmileOne SKU linking

### What's Needed

To auto-fulfill orders, each pricing tier needs two fields set:
- `provider_id` → SmileOne's ID (`46348dcb-...`)
- `provider_product_id` → The exact SmileOne SKU code for that diamond pack

### Steps

1. **Create MLBB BRAZIL product** with all tiers from the screenshot (Diamond x78+8, x156+16, x234+23, x500+65, x625+81, etc.) with R$ prices converted to INR (~₹15/R$1 approximate rate)

2. **Update all existing MLBB tiers** (MID PACK, LARGE PACK, DOUBLE DIAMONDS, STARLIGHT, WEEKLY PASS) to set `provider_id` to SmileOne and the correct `provider_product_id` SKU

3. **Update BGMI, Genshin, Honour of Kings** tiers with their respective SmileOne SKUs (if available on SmileOne)

4. **Ensure ProductDetail.tsx** order flow correctly passes the `provider_id` and `provider_product_id` to the `smilecode-order` edge function for automatic fulfillment

### What I Need From You

I need the **exact SmileOne SKU IDs** for each product tier. You can find these in your SmileOne dashboard or by using the SmileCode API `sku_list` action. For example:
- MLBB Brazil: what is the `apiGame` code? (e.g., `mobilelegendsbrazil`)
- Each diamond pack's SKU number (e.g., SKU `382` = 3 Diamonds)

Without the correct SKU IDs, orders will fail. Should I **call the SmileOne API automatically** to fetch all available games and their SKU lists, then match them to your products?

