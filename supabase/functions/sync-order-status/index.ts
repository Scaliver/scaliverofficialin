import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SMM_API_KEY = Deno.env.get('SMM_API_KEY');
const SMM_API_URL = Deno.env.get('SMM_API_URL');
const ALUU_API_KEY = Deno.env.get('ALUU_API_KEY');
const ALUU_BASE = 'https://aluu.in/api/v.1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function mapStatus(raw: string): string {
  const s = (raw || '').toLowerCase();
  if (['completed', 'complete', 'success', 'successful', 'delivered', 'partial'].includes(s)) return 'completed';
  if (['canceled', 'cancelled', 'refunded', 'failed', 'fail', 'error'].includes(s)) return 'failed';
  if (['processing', 'in progress', 'inprogress'].includes(s)) return 'processing';
  if (s === 'pending') return 'pending';
  return 'processing';
}

async function fetchAluuStatus(orderId: string) {
  if (!ALUU_API_KEY) return null;
  try {
    const res = await fetch(`${ALUU_BASE}/${encodeURIComponent(orderId)}`, {
      headers: { 'x-api-key': ALUU_API_KEY },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data || json;
    const status = data?.status;
    if (!status) return null;
    return { status, providerOrderId: data?.provider_order_id || data?.reference || null };
  } catch (e) {
    console.error('Aluu fetch error:', e);
    return null;
  }
}

async function fetchSmmStatus(smmOrderId: string) {
  if (!SMM_API_KEY || !SMM_API_URL) return null;
  try {
    const url = /^https?:\/\//i.test(SMM_API_URL) ? SMM_API_URL : `https://${SMM_API_URL}`;
    const fd = new URLSearchParams();
    fd.append('key', SMM_API_KEY);
    fd.append('action', 'status');
    fd.append('order', smmOrderId);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: fd.toString(),
    });
    const json = await res.json();
    if (json?.error) return null;
    return { status: json?.status };
  } catch (e) {
    console.error('SMM fetch error:', e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let specificOrderId: string | null = null;
    try { const body = await req.json(); specificOrderId = body?.orderId || null; } catch { /* noop */ }

    // STEP 1: auto-verify any pending UPI payment requests via Chuimei.
    // This makes the full payment → order flow automatic even if the user
    // never returns to /payment-detect.
    let verifiedUpiCount = 0;
    if (!specificOrderId) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: pendingPayments } = await supabase
        .from('upi_payment_requests')
        .select('id')
        .eq('status', 'pending')
        .gte('created_at', since)
        .limit(50);

      for (const p of pendingPayments || []) {
        try {
          await supabase.functions.invoke('chuimei-payment', {
            body: { action: 'verify_payment', order_id: p.id },
          });
          verifiedUpiCount++;
        } catch (e) {
          console.error('verify_payment invoke failed', p.id, e);
        }
      }
    }

    let query = supabase
      .from('orders')
      .select('id, smm_order_id, status, user_id, price, product_name, payment_request_id')
      .in('status', ['pending', 'processing']);
    if (specificOrderId) query = query.eq('id', specificOrderId);

    const { data: orders, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];
    let updatedCount = 0;

    for (const order of orders || []) {
      try {
        // Try Aluu first using our order id as partner_orderid
        let result = await fetchAluuStatus(order.id);
        let provider = 'aluu';

        // Fall back to SMM if Aluu didn't recognize it and we have an SMM ID
        if (!result && order.smm_order_id) {
          result = await fetchSmmStatus(order.smm_order_id);
          provider = 'smm';
        }

        if (!result) {
          results.push({ orderId: order.id, synced: false, reason: 'no provider match' });
          continue;
        }

        const newStatus = mapStatus(result.status);
        if (newStatus === order.status) {
          results.push({ orderId: order.id, synced: true, status: newStatus, provider });
          continue;
        }

        const update: any = { status: newStatus };
        if (provider === 'aluu' && (result as any).providerOrderId) {
          update.smm_order_id = (result as any).providerOrderId;
        }

        await supabase.from('orders').update(update).eq('id', order.id);

        // Auto refund on failure
        if (newStatus === 'failed' && order.user_id && order.price) {
          // Avoid duplicate refunds
          const { data: existing } = await supabase
            .from('coin_transactions')
            .select('id')
            .eq('reference_id', order.id)
            .eq('type', 'credit')
            .maybeSingle();
          if (!existing) {
            const { data: wallet } = await supabase
              .from('wallets').select('balance').eq('user_id', order.user_id).maybeSingle();
            const current = Number(wallet?.balance || 0);
            await supabase.from('wallets')
              .update({ balance: current + Number(order.price), updated_at: new Date().toISOString() })
              .eq('user_id', order.user_id);
            await supabase.from('coin_transactions').insert({
              user_id: order.user_id, amount: order.price, type: 'credit',
              description: `Refund: ${order.product_name} (order failed)`,
              reference_id: order.id,
            });
          }
        }

        updatedCount++;
        results.push({ orderId: order.id, synced: true, oldStatus: order.status, newStatus, provider });
      } catch (e) {
        console.error('Order sync error', order.id, e);
        results.push({ orderId: order.id, synced: false, reason: String(e) });
      }
    }

    return new Response(JSON.stringify({
      success: true, totalOrders: results.length, updatedCount, results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
