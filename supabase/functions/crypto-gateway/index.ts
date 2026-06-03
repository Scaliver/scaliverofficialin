// Crypto USDT(BEP20) gateway — proxies Aluu crypto APIs and handles wallet credits/debits.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALUU_BASE = "https://aluu.in";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data } = await sb.auth.getUser(token);
  return data.user ?? null;
}

async function aluuFetch(path: string, init: RequestInit = {}) {
  const apiKey = Deno.env.get("ALUU_CRYPTO_API_KEY");
  if (!apiKey) throw new Error("ALUU_CRYPTO_API_KEY not configured");
  const res = await fetch(`${ALUU_BASE}${path}`, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function finalizeDeposit(
  sb: ReturnType<typeof admin>,
  params: {
    userId: string;
    orderReference: string;
    txHash?: string | null;
    amountPaid: number;
    gatewayStatus: string;
    source: "verify_tx" | "webhook" | "status_refresh";
    payload: unknown;
  },
) {
  const { data, error } = await sb.rpc("process_crypto_deposit", {
    p_user_id: params.userId,
    p_order_reference: params.orderReference,
    p_transaction_hash: params.txHash ?? null,
    p_amount: Number(params.amountPaid.toFixed(4)),
    p_status: params.gatewayStatus,
    p_source: params.source,
    p_payload: params.payload ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as {
    success?: boolean;
    confirming?: boolean;
    error?: string;
    credited_amount?: number;
    wallet_balance?: number;
    already_processed?: boolean;
    status?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const sb = admin();

    // -------- create_order: user starts USDT top-up --------
    if (action === "create_order") {
      const user = await getUser(req);
      if (!user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 1) {
        return jsonResponse({ success: false, error: "Minimum amount is 1 USDT" }, 400);
      }

      const projectId = Deno.env.get("SUPABASE_URL")!.match(/https:\/\/([^.]+)/)?.[1];
      const webhook_url = `https://${projectId}.functions.supabase.co/crypto-gateway?webhook=1`;

      const { status, json } = await aluuFetch(`/api/gateway/crypto/create-order`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount.toFixed(4)), webhook_url }),
      });

      if (status >= 300 || !json?.success) {
        return jsonResponse({
          success: false,
          error: json?.message || `Aluu HTTP ${status}`,
          raw: json,
        }, 200);
      }

      const d = json.data ?? {};
      const orderRef = d.order_id;

      // Persist crypto_orders row
      const { data: row, error: insErr } = await sb.from("crypto_orders").insert({
        user_id: user.id,
        order_reference: orderRef,
        external_order_id: orderRef,
        request_type: "coin_recharge",
        amount: Number(d.amount ?? amount),
        currency: d.currency ?? "USDT",
        network: d.network ?? "BSC",
        wallet_address: d.address ?? null,
        expires_at: d.expires_at ?? null,
        status: "pending",
        credited: false,
        metadata: d,
      }).select().single();

      if (insErr) console.error("crypto_orders insert", insErr);

      return jsonResponse({
        success: true,
        data: { ...d, db_id: row?.id },
      });
    }

    // -------- verify_tx: user submitted a tx hash --------
    if (action === "verify_tx") {
      const user = await getUser(req);
      if (!user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

      const { order_id, tx_hash } = body;
      if (!order_id || !tx_hash) return jsonResponse({ success: false, error: "order_id and tx_hash required" }, 400);

      // confirm ownership
      const { data: order } = await sb.from("crypto_orders")
        .select("*").eq("order_reference", order_id).eq("user_id", user.id).maybeSingle();
      if (!order) return jsonResponse({ success: false, error: "Order not found" }, 404);

      const { status, json } = await aluuFetch(`/api/gateway/crypto/verify-tx`, {
        method: "POST",
        body: JSON.stringify({ order_id, tx_hash }),
      });

      // Pending confirmations
      if (status === 202 || json?.data?.status === "pending") {
        await sb.from("crypto_orders").update({
          status: "confirming",
          transaction_hash: tx_hash,
          error_message: null,
          metadata: { ...(order.metadata ?? {}), verify: json?.data },
        }).eq("id", order.id);
        return jsonResponse({
          success: false,
          confirming: true,
          data: json?.data,
          message: json?.message ?? "Waiting for blockchain confirmations",
        });
      }

      // Success
      if (status === 200 && json?.success && json?.data?.status === "credited") {
        const amountPaid = Number(json.data.amount_paid ?? order.amount);
        const feeDeducted = Number(json.data.fee_deducted ?? 0);
        const netCredit = Math.max(0, amountPaid - feeDeducted);

        const finalization = await finalizeDeposit(sb, {
          userId: user.id,
          orderReference: order_id,
          txHash: tx_hash,
          amountPaid: netCredit,
          gatewayStatus: json.data.status,
          source: "verify_tx",
          payload: json.data,
        });

        if (!finalization?.success) {
          return jsonResponse({
            success: false,
            error: finalization?.error || "Wallet credit failed",
            data: json.data,
          }, 200);
        }

        return jsonResponse({
          success: true,
          credited: Number(finalization.credited_amount ?? netCredit),
          wallet_balance: Number(finalization.wallet_balance ?? 0),
          already_processed: Boolean(finalization.already_processed),
          data: json.data,
        });
      }

      // Failed
      await sb.from("crypto_orders").update({
        status: "failed",
        transaction_hash: tx_hash,
        notes: json?.message ?? null,
        error_message: json?.message ?? `Verify failed (${status})`,
      }).eq("id", order.id);
      return jsonResponse({ success: false, error: json?.message || `Verify failed (${status})`, data: json?.data });
    }

    // -------- get_balance --------
    if (action === "get_balance") {
      const user = await getUser(req);
      if (!user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);
      const { data } = await sb.from("crypto_wallets").select("balance").eq("user_id", user.id).maybeSingle();
      return jsonResponse({ success: true, balance: Number(data?.balance ?? 0) });
    }

    // -------- get_order: status refresh --------
    if (action === "get_order") {
      const user = await getUser(req);
      if (!user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);
      const { order_id } = body;
      const { data } = await sb.from("crypto_orders")
        .select("*").eq("order_reference", order_id).eq("user_id", user.id).maybeSingle();
      return jsonResponse({ success: true, data });
    }

    // -------- purchase: deduct USDT from wallet for a product --------
    if (action === "purchase") {
      const user = await getUser(req);
      if (!user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);
      const amount = Number(body.amount_usdt);
      const ref = String(body.reference || `purchase-${Date.now()}`);
      if (!Number.isFinite(amount) || amount <= 0) {
        return jsonResponse({ success: false, error: "Invalid USDT amount" }, 400);
      }
      const { error } = await sb.rpc("debit_crypto_wallet", {
        p_user_id: user.id,
        p_amount: amount,
        p_reference: ref,
      });
      if (error) return jsonResponse({ success: false, error: error.message }, 200);
      return jsonResponse({ success: true });
    }

    // -------- admin_set_status --------
    if (action === "admin_set_status") {
      const user = await getUser(req);
      if (!user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);
      const { order_id, new_status } = body;
      const { data, error } = await sb.rpc("admin_set_crypto_order_status", {
        p_order_id: order_id,
        p_new_status: new_status,
      });
      if (error) return jsonResponse({ success: false, error: error.message }, 200);
      return jsonResponse({ success: true, data });
    }

    // -------- webhook from Aluu --------
    const url = new URL(req.url);
    if (url.searchParams.get("webhook") === "1" || action === "webhook") {
      const payload = body;
      const orderRef = payload?.order_id ?? payload?.data?.order_id;
      if (orderRef) {
        const { data: order } = await sb.from("crypto_orders")
          .select("*").eq("order_reference", orderRef).maybeSingle();
        if (order && !order.credited) {
          const gatewayStatus = payload?.status ?? payload?.data?.status ?? "pending";
          const amt = Number(payload?.amount_paid ?? payload?.data?.amount_paid ?? order.amount);
          const fee = Number(payload?.fee_deducted ?? payload?.data?.fee_deducted ?? 0);
          const finalization = await finalizeDeposit(sb, {
            userId: order.user_id,
            orderReference: orderRef,
            txHash: payload?.tx_hash ?? payload?.transaction_hash ?? payload?.data?.tx_hash ?? payload?.data?.transaction_hash ?? order.transaction_hash,
            amountPaid: Math.max(0, amt - fee),
            gatewayStatus,
            source: "webhook",
            payload,
          });

          if (!finalization?.success && !finalization?.confirming) {
            console.error("webhook finalize failed", finalization?.error || "Unknown error");
          }
        }
      }
      return jsonResponse({ success: true });
    }

    return jsonResponse({ success: false, error: "Unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("crypto-gateway error:", msg);
    return jsonResponse({ success: false, error: msg }, 200);
  }
});
