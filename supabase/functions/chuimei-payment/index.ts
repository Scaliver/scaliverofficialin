import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHUIMEI_API_URL = 'https://chuimei-pe.in/api/create-order';
const ALUU_BASE_URL = 'https://aluu.in/api/v.1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Handle GET callback (redirect from payment gateway)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const params = Object.fromEntries(url.searchParams.entries());
      console.log('Chuimei-pe GET callback params:', JSON.stringify(params));

      const callbackOrderId = params.order_id || params.orderId || params.client_txn_id;
      const paymentStatus = params.status || params.payment_status;

      let resolvedStatus = paymentStatus;
      if (callbackOrderId) {
        // If status is missing/unclear, actively verify with Chuimei before processing.
        const isExplicit = paymentStatus && ['success','SUCCESS','true','failed','failure','cancelled'].includes(paymentStatus);
        if (!isExplicit) {
          try {
            const apiToken = Deno.env.get('CHUIMEI_API_TOKEN') || '';
            const fd = new URLSearchParams();
            fd.append('user_token', apiToken);
            fd.append('order_id', callbackOrderId);
            const r = await fetch('https://chuimei-pe.in/api/check-order-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: fd.toString(),
            });
            const txt = await r.text();
            console.log('GET-callback verify response:', txt);
            let parsed: any = {}; try { parsed = JSON.parse(txt); } catch {}
            const inner = parsed?.results || parsed?.data || parsed?.result || parsed;
            const raw = (inner?.txnStatus || inner?.status || parsed?.status || '').toString().toLowerCase();
            if (raw === 'success' || raw === 'completed' || raw === 'paid' || parsed?.status === true) resolvedStatus = 'success';
            else if (raw === 'failed' || raw === 'failure' || raw === 'cancelled') resolvedStatus = 'failed';
          } catch (e) { console.error('verify-on-callback error:', e); }
        }
        await handlePaymentCallback(supabase, callbackOrderId, resolvedStatus || '');
      }

      // Determine target path: wallet recharges → /wallet (success) or /add-coin (fail).
      // Product orders → always /orders (success or fail) so user sees history.
      const isSuccess = resolvedStatus === 'success' || resolvedStatus === 'SUCCESS' || resolvedStatus === 'true';
      let targetPath = isSuccess ? '/wallet' : '/add-coin';
      let absoluteRedirect: string | null = null;
      if (callbackOrderId) {
        const { data: pr } = await supabase
          .from('upi_payment_requests')
          .select('request_type, redirect_path')
          .eq('id', callbackOrderId)
          .maybeSingle();
        const rp = pr?.redirect_path || '';
        if (rp && /^https?:\/\//i.test(rp)) {
          absoluteRedirect = rp;
        } else if (pr?.request_type === 'product_order') {
          targetPath = rp || '/orders';
        } else if (!isSuccess) {
          targetPath = rp || '/add-coin';
        }
      }
      const baseRedirect = params.redirect_url || 'https://scaliverofficial.in';
      const redirectTo = absoluteRedirect
        ? absoluteRedirect
        : baseRedirect.replace(/\/$/, '') + targetPath;
      const sep = redirectTo.includes('?') ? '&' : '?';
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectTo + sep + `payment_order=${callbackOrderId || ''}&status=${resolvedStatus || 'unknown'}` },
      });
    }

    // Parse body — accept JSON or form-urlencoded (Chuimei webhook posts form data)
    const ctype = (req.headers.get('content-type') || '').toLowerCase();
    const rawBody = await req.text();
    let body: any = {};
    try {
      if (ctype.includes('application/json')) {
        body = JSON.parse(rawBody);
      } else if (ctype.includes('application/x-www-form-urlencoded') || ctype.includes('multipart/form-data')) {
        body = Object.fromEntries(new URLSearchParams(rawBody).entries());
      } else {
        // Try JSON first, fall back to form parsing
        try { body = JSON.parse(rawBody); } catch { body = Object.fromEntries(new URLSearchParams(rawBody).entries()); }
      }
    } catch (e) {
      console.error('Body parse error:', e, 'raw:', rawBody.substring(0, 300));
    }
    let { action } = body;

    // Webhook callbacks from Chuimei don't include "action" — treat any POST
    // carrying an order_id (and no recognised action) as a webhook callback.
    if (!action) {
      const probableOrderId = body.order_id || body.orderId || body.client_txn_id;
      if (probableOrderId) {
        action = 'callback';
      } else {
        return new Response(JSON.stringify({ success: false, error: 'Action is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    switch (action) {
      case 'create_order': {
        const { amount, order_id, customer_mobile, redirect_url, remark1, remark2 } = body;
        const apiToken = Deno.env.get('CHUIMEI_API_TOKEN');
        if (!apiToken) {
          return new Response(JSON.stringify({ success: false, error: 'Chuimei API token not configured' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!amount || amount < 1) {
          return new Response(JSON.stringify({ success: false, error: 'Minimum amount is ₹1' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!order_id || !customer_mobile) {
          return new Response(JSON.stringify({ success: false, error: 'order_id and customer_mobile are required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Callback URL = this edge function (GET)
        const callbackUrl = `${supabaseUrl}/functions/v1/chuimei-payment`;

        const formData = new URLSearchParams();
        formData.append('customer_mobile', customer_mobile);
        formData.append('user_token', apiToken);
        formData.append('amount', String(amount));
        formData.append('order_id', order_id);
        formData.append('redirect_url', callbackUrl);
        if (remark1) formData.append('remark1', remark1);
        if (remark2) formData.append('remark2', remark2);

        console.log('Chuimei-pe create order:', { order_id, amount, customer_mobile });

        const response = await fetch(CHUIMEI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        });

        const responseText = await response.text();
        console.log('Chuimei-pe response:', responseText);

        let result;
        try { result = JSON.parse(responseText); } catch {
          return new Response(JSON.stringify({ success: false, error: `Invalid API response: ${responseText.substring(0, 200)}` }), {
            status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (result.status === true || result.status === 'true') {
          const paymentUrl = result.result?.payment_url || result.payment_url || result.data?.payment_url;
          return new Response(JSON.stringify({ success: true, payment_url: paymentUrl, order_id, data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: false, error: result.message || 'Payment order creation failed', data: result }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'callback': {
        // POST webhook callback. Chuimei's payload format isn't guaranteed, so
        // we ALWAYS re-verify with /check-order-status before fulfilling.
        console.log('Chuimei-pe POST callback raw:', rawBody.substring(0, 500));
        console.log('Chuimei-pe POST callback parsed:', JSON.stringify(body));
        const callbackOrderId = body.order_id || body.orderId || body.client_txn_id;
        if (!callbackOrderId) {
          return new Response(JSON.stringify({ success: false, error: 'order_id missing in webhook' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        let resolved = body.status || body.payment_status || '';
        try {
          const apiToken = Deno.env.get('CHUIMEI_API_TOKEN') || '';
          const fd = new URLSearchParams();
          fd.append('user_token', apiToken);
          fd.append('order_id', callbackOrderId);
          const r = await fetch('https://chuimei-pe.in/api/check-order-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: fd.toString(),
          });
          const txt = await r.text();
          console.log('Webhook verify response:', txt);
          let parsed: any = {}; try { parsed = JSON.parse(txt); } catch {}
          const inner = parsed?.results || parsed?.data || parsed?.result || parsed;
          const raw = (inner?.txnStatus || inner?.status || '').toString().toLowerCase();
          if (raw === 'success' || raw === 'completed' || raw === 'paid') resolved = 'success';
          else if (raw === 'failed' || raw === 'failure' || raw === 'cancelled') resolved = 'failed';
        } catch (e) { console.error('webhook verify error:', e); }
        await handlePaymentCallback(supabase, callbackOrderId, resolved);
        return new Response(JSON.stringify({ success: true, resolved }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'check_status': {
        const checkOrderId = body.order_id;
        if (!checkOrderId) {
          return new Response(JSON.stringify({ success: false, error: 'order_id required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: paymentReq } = await supabase
          .from('upi_payment_requests')
          .select('status, total_coins, amount, request_type')
          .eq('id', checkOrderId)
          .single();

        return new Response(JSON.stringify({
          success: true,
          status: paymentReq?.status || 'pending',
          total_coins: paymentReq?.total_coins,
          amount: paymentReq?.amount,
          request_type: paymentReq?.request_type,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'verify_payment': {
        // Called by the frontend after the user is redirected back. Actively
        // queries Chuimei-pe to confirm payment status, then runs the same
        // fulfillment logic as the webhook callback (credits coins or creates
        // the Aluu order automatically).
        const verifyOrderId = body.order_id;
        if (!verifyOrderId) {
          return new Response(JSON.stringify({ success: false, error: 'order_id required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Short-circuit if already finalised in DB
        const { data: existing } = await supabase
          .from('upi_payment_requests')
          .select('status')
          .eq('id', verifyOrderId)
          .maybeSingle();
        if (existing?.status === 'completed') {
          const { data: linkedOrder } = await supabase
            .from('orders')
            .select('id, status')
            .eq('payment_request_id', verifyOrderId)
            .maybeSingle();

          if (!linkedOrder && existing?.status === 'completed') {
            const { data: requestRecord } = await supabase
              .from('upi_payment_requests')
              .select('*')
              .eq('id', verifyOrderId)
              .maybeSingle();

            if (requestRecord?.request_type === 'product_order') {
              await fulfillProductOrder(supabase, requestRecord);
            }
          }

          const { data: refreshedOrder } = await supabase
            .from('orders')
            .select('id, status')
            .eq('payment_request_id', verifyOrderId)
            .maybeSingle();

          return new Response(JSON.stringify({
            success: true,
            status: refreshedOrder ? (refreshedOrder.status === 'pending' ? 'processing' : refreshedOrder.status) : 'completed',
            has_order: !!refreshedOrder,
            order_id: refreshedOrder?.id || null,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const apiToken = Deno.env.get('CHUIMEI_API_TOKEN');
        if (!apiToken) {
          return new Response(JSON.stringify({ success: false, error: 'Chuimei API token not configured' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const fd = new URLSearchParams();
        fd.append('user_token', apiToken);
        fd.append('order_id', verifyOrderId);

        let providerStatus = 'pending';
        try {
          const r = await fetch('https://chuimei-pe.in/api/check-order-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: fd.toString(),
          });
          const txt = await r.text();
          console.log('Chuimei verify response:', txt);
          let parsed: any = {};
          try { parsed = JSON.parse(txt); } catch {}
          const inner = parsed?.results || parsed?.data || parsed?.result || parsed;
          const raw = (inner?.txnStatus || inner?.status || parsed?.status || '').toString().toLowerCase();
          if (raw === 'success' || raw === 'completed' || raw === 'true' || raw === 'paid' || parsed?.status === true) {
            providerStatus = 'success';
          } else if (raw === 'failed' || raw === 'failure' || raw === 'cancelled') {
            providerStatus = 'failed';
          }
        } catch (e) {
          console.error('Chuimei verify error:', e);
        }

        if (providerStatus === 'success') {
          await handlePaymentCallback(supabase, verifyOrderId, 'success');
        } else if (providerStatus === 'failed') {
          await handlePaymentCallback(supabase, verifyOrderId, 'failed');
        }

        const { data: after } = await supabase
          .from('upi_payment_requests')
          .select('status, total_coins, amount, request_type')
          .eq('id', verifyOrderId)
          .maybeSingle();

        const { data: orderAfter } = await supabase
          .from('orders')
          .select('id, status')
          .eq('payment_request_id', verifyOrderId)
          .maybeSingle();

        return new Response(JSON.stringify({
          success: true,
          status: orderAfter?.status || after?.status || providerStatus,
          total_coins: after?.total_coins,
          amount: after?.amount,
          request_type: after?.request_type,
          has_order: !!orderAfter,
          order_id: orderAfter?.id || null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action "${action}"` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Chuimei payment error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handlePaymentCallback(supabase: any, orderId: string, status: string) {
  if (!orderId) return;
  
  const isSuccess = status === 'success' || status === 'SUCCESS' || status === 'true' || status === true ||
    status === 'paid' || status === 'PAID' || status === 'completed' || status === 'COMPLETED' ||
    status === 'complete' || status === '1' || status === 1;
  console.log(`Processing callback for ${orderId}, status: ${status}, isSuccess: ${isSuccess}`);

  // DUPLICATE PROTECTION: Fetch current status FIRST
  const { data: existingReq } = await supabase
    .from('upi_payment_requests')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!existingReq) {
    console.log(`Payment request ${orderId} not found`);
    return;
  }

  if (existingReq.status === 'completed') {
    console.log(`Payment ${orderId} already completed, skipping duplicate callback`);
    return;
  }

  await supabase
    .from('upi_payment_requests')
    .update({ status: isSuccess ? 'completed' : 'failed', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (!isSuccess) return;
  if (!existingReq.user_id) {
    console.log(`No user_id for payment ${orderId}`);
    return;
  }

  if (existingReq.request_type === 'product_order') {
    await fulfillProductOrder(supabase, existingReq);
    return;
  }

  const totalCoins = Number(existingReq.total_coins || existingReq.amount);
  const { data: wallet } = await supabase
    .from('wallets').select('balance').eq('user_id', existingReq.user_id).single();

  if (wallet) {
    await supabase.from('wallets')
      .update({ balance: Number(wallet.balance) + totalCoins, updated_at: new Date().toISOString() })
      .eq('user_id', existingReq.user_id);
  } else {
    await supabase.from('wallets').insert({ user_id: existingReq.user_id, balance: totalCoins });
  }

  await supabase.from('coin_transactions').insert({
    user_id: existingReq.user_id,
    amount: totalCoins,
    type: 'credit',
    description: `Coin recharge via online payment (₹${existingReq.amount})`,
    reference_id: orderId,
  });

  console.log(`Auto-credited ${totalCoins} coins to user ${existingReq.user_id}`);
}

async function fetchAluuProviderStatus(partnerOrderId: string) {
  const apiKey = Deno.env.get('ALUU_API_KEY');
  if (!apiKey) return null;

  try {
    const response = await fetch(`${ALUU_BASE_URL}/${encodeURIComponent(partnerOrderId)}`, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const rawText = await response.text();
    let parsed: any = {};
    try { parsed = JSON.parse(rawText); } catch { parsed = { raw: rawText }; }
    const payload = parsed?.data || parsed;
    const status = payload?.status ? String(payload.status).toLowerCase() : null;

    return {
      ok: response.ok,
      status,
      providerReference: payload?.provider_order_id || payload?.reference || parsed?.reference || null,
      raw: parsed,
    };
  } catch (error) {
    console.error('fetchAluuProviderStatus failed:', error);
    return null;
  }
}

async function upsertWebhookAuditLog(supabase: any, paymentRequestId: string, stage: string, payload: Record<string, unknown>) {
  try {
    const serialized = JSON.stringify({ stage, payload });
    await supabase.from('audit_logs').insert({
      admin_id: '00000000-0000-0000-0000-000000000000',
      action: `chuimei_${stage}`,
      resource_type: 'upi_payment_requests',
      resource_id: paymentRequestId,
      details: { payload: serialized },
    });
  } catch (error) {
    console.error('audit log insert failed:', error);
  }
}

async function fulfillProductOrder(supabase: any, req: any) {
  console.log(`Fulfilling product order for payment ${req.id}`);

  let orderData: any = null;
  const { data: existingOrder, error: existingOrderError } = await supabase
    .from('orders')
    .select('id, status, smm_order_id, payment_request_id')
    .eq('payment_request_id', req.id)
    .maybeSingle();

  if (existingOrderError) {
    console.error('Failed to check existing order:', existingOrderError);
    return;
  }

  if (existingOrder?.id) {
    orderData = existingOrder;
    console.log(`Order already exists for payment ${req.id}: ${existingOrder.id}`);
  } else {
    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders').insert({
        user_id: req.user_id,
        product_id: req.product_id,
        product_name: req.product_name,
        amount: req.product_pack,
        price: req.amount,
        user_game_id: req.player_id,
        zone_id: req.zone_id,
        contact_number: req.user_email || '',
        status: 'pending',
        payment_request_id: req.id,
      }).select().single();

    if (orderError) {
      console.error('Failed to create order:', orderError);
      return;
    }

    orderData = insertedOrder;

    try {
      await supabase.from('coin_transactions').insert({
        user_id: req.user_id,
        amount: Number(req.amount),
        type: 'debit',
        description: `Purchase: ${req.product_name || 'Product'} (UPI gateway)`,
        reference_id: orderData.id,
      });
    } catch (e) {
      console.error('coin_transactions insert failed:', e);
    }
  }

  if (orderData.smm_order_id && ['processing', 'completed'].includes(orderData.status || '')) {
    console.log(`Order ${orderData.id} already sent to provider, skipping duplicate fulfillment.`);
    return;
  }

  const finalizeFailure = async (reason: string, details: Record<string, unknown> = {}) => {
    console.error('Provider fulfillment failed:', reason, details);
    await supabase.from('orders').update({ status: 'failed' }).eq('id', orderData.id);
    await upsertWebhookAuditLog(supabase, req.id, 'order_failed', { orderId: orderData.id, reason, ...details });
  };

  if (req.provider_id && req.provider_product_id) {
    try {
      const { data: apiData } = await supabase
        .from('smm_apis').select('api_type').eq('id', req.provider_id).single();
      const apiType = apiData?.api_type || 'aluu';

      if (apiType === 'aluu') {
        const [gamecode, denom] = String(req.provider_product_id).split(':');
        if (!gamecode || !denom) {
          await finalizeFailure('Invalid Aluu provider mapping', { provider_product_id: req.provider_product_id });
          return;
        }

        const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/aluu-webhook`;
        const { data: aluuData, error: aluuError } = await supabase.functions.invoke('aluu-order', {
          body: {
            action: 'create_order',
            game: gamecode,
            denom,
            userid: req.player_id,
            serverid: req.zone_id || undefined,
            charname: req.player_name || req.player_id,
            partner_orderid: orderData.id,
            partner_webhook_url: webhookUrl,
          },
        });

        if (aluuError || !aluuData?.success) {
          await finalizeFailure(aluuData?.error || aluuData?.message || aluuError?.message || 'Aluu order failed', { response: aluuData || null });
          return;
        }

        await upsertWebhookAuditLog(supabase, req.id, 'aluu_create_order', { orderId: orderData.id, response: aluuData });

        const immediateStatus = await fetchAluuProviderStatus(orderData.id);
        const normalizedStatus = (immediateStatus?.status || '').toLowerCase();
        const nextStatus = ['successful', 'success', 'completed', 'delivered'].includes(normalizedStatus)
          ? 'completed'
          : ['failed', 'cancelled', 'canceled', 'refunded'].includes(normalizedStatus)
            ? 'failed'
            : 'processing';

        await supabase.from('orders').update({
          status: nextStatus,
          smm_order_id: immediateStatus?.providerReference || aluuData?.data?.provider_order_id || aluuData?.data?.reference || null,
        }).eq('id', orderData.id);

        if (nextStatus === 'failed') {
          await upsertWebhookAuditLog(supabase, req.id, 'aluu_status_failed', { orderId: orderData.id, response: immediateStatus?.raw || aluuData });
        }
      } else if (apiType === 'gametopup') {
        const { data: gtData, error: gtErr } = await supabase.functions.invoke('gametopup-order', {
          body: {
            action: 'order', apiId: req.provider_id,
            playerId: req.player_id, zoneId: req.zone_id,
            productId: req.provider_product_id, currency: 'INR',
          },
        });
        if (gtErr || gtData?.error || !gtData?.success) {
          await finalizeFailure(gtData?.message || gtData?.error || gtErr?.message || 'GameTopUp order failed', { response: gtData || null });
          return;
        }
        await supabase.from('orders').update({
          status: 'processing',
          smm_order_id: gtData.order_id ? String(gtData.order_id) : null,
        }).eq('id', orderData.id);
      }
    } catch (err) {
      await finalizeFailure(err instanceof Error ? err.message : String(err));
    }
  } else if (req.is_social_media && req.smm_service_id && req.smm_quantity) {
    try {
      const { data: smmData, error: smmErr } = await supabase.functions.invoke('smm-order', {
        body: { action: 'order', service: req.smm_service_id, link: req.player_id, quantity: req.smm_quantity },
      });
      if (smmErr || smmData?.error) {
        await finalizeFailure(smmData?.error || smmErr?.message || 'SMM order failed', { response: smmData || null });
        return;
      }
      await supabase.from('orders').update({
        status: 'processing',
        smm_order_id: smmData.order ? String(smmData.order) : null,
      }).eq('id', orderData.id);
    } catch (err) {
      await finalizeFailure(err instanceof Error ? err.message : String(err));
    }
  } else {
    await finalizeFailure('No valid provider mapping found');
  }
}
