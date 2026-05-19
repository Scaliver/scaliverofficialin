import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-timestamp, x-webhook-signature',
};

async function hmacSha256Hex(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const rawBody = await req.text();
  const timestamp = req.headers.get("X-Webhook-Timestamp") || req.headers.get("x-webhook-timestamp") || "";
  const signature = req.headers.get("X-Webhook-Signature") || req.headers.get("x-webhook-signature") || "";

  const secret = Deno.env.get("ALUU_SECRET_KEY");
  if (!secret) {
    console.error("ALUU_SECRET_KEY not configured");
    return new Response("Server misconfig", { status: 500, headers: corsHeaders });
  }

  // Verify signature (skip enforcement if missing, but log)
  if (timestamp && signature) {
    const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
    if (!timingSafeEqual(expected, signature)) {
      console.error("Invalid webhook signature");
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }
  } else {
    console.warn("Webhook missing timestamp or signature headers");
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch {
    return new Response("Bad JSON", { status: 400, headers: corsHeaders });
  }

  const data = payload?.data || payload;
  const partnerOrderId: string = data?.orderid;
  const status: string = (data?.status || "").toLowerCase();
  const providerOrderId: string | undefined = data?.provider_order_id || data?.reference;

  if (!partnerOrderId) {
    return new Response("Missing orderid", { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Map Aluu statuses to our orders.status
  let newStatus = "processing";
  if (["successful", "success", "completed", "delivered"].includes(status)) newStatus = "completed";
  else if (["failed", "cancelled", "canceled", "refunded"].includes(status)) newStatus = "failed";

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("id, user_id, price, product_name, status, payment_request_id")
    .eq("id", partnerOrderId)
    .maybeSingle();

  if (fetchErr || !order) {
    console.error("Order not found:", partnerOrderId, fetchErr);
    return new Response("Order not found", { status: 404, headers: corsHeaders });
  }

  // Idempotency: skip if already finalized
  if (order.status === "completed" || order.status === "failed") {
    return new Response(JSON.stringify({ ok: true, idempotent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  await supabase.from("orders").update({
    status: newStatus,
    smm_order_id: providerOrderId || null,
  }).eq("id", order.id);

  // Auto refund on failure
  if (newStatus === "failed" && order.user_id && order.price) {
    const { data: wallet } = await supabase
      .from("wallets").select("balance").eq("user_id", order.user_id).maybeSingle();
    const current = Number(wallet?.balance || 0);
    await supabase.from("wallets").update({ balance: current + Number(order.price) }).eq("user_id", order.user_id);
    await supabase.from("coin_transactions").insert({
      user_id: order.user_id,
      amount: order.price,
      type: "credit",
      description: `Refund: ${order.product_name} (order failed)`,
      reference_id: order.id,
    });
  }

  return new Response(JSON.stringify({ ok: true, status: newStatus }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
