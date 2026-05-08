import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHUIMEI_API_URL = 'https://chuimei-pe.in/api/create-order';

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

      if (callbackOrderId) {
        await handlePaymentCallback(supabase, callbackOrderId, paymentStatus);
      }

      // Determine target path: product orders return to product page, recharges to /wallet
      const isSuccess = paymentStatus === 'success' || paymentStatus === 'SUCCESS' || paymentStatus === 'true';
      let targetPath = isSuccess ? '/wallet' : '/add-coin';
      if (callbackOrderId) {
        const { data: pr } = await supabase
          .from('upi_payment_requests')
          .select('request_type, redirect_path')
          .eq('id', callbackOrderId)
          .maybeSingle();
        if (pr?.request_type === 'product_order') {
          targetPath = pr.redirect_path || '/orders';
        }
      }
      const baseRedirect = params.redirect_url || 'https://scaliverofficialin.lovable.app';
      const redirectTo = baseRedirect.replace(/\/$/, '') + targetPath;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectTo + `?payment_order=${callbackOrderId || ''}&status=${paymentStatus || 'unknown'}` },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return new Response(JSON.stringify({ success: false, error: 'Action is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
        // POST webhook callback
        console.log('Chuimei-pe POST callback:', JSON.stringify(body));
        const callbackOrderId = body.order_id || body.orderId || body.client_txn_id;
        const paymentStatus = body.status || body.payment_status;
        await handlePaymentCallback(supabase, callbackOrderId, paymentStatus);
        return new Response(JSON.stringify({ success: true }), {
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
          .select('status, total_coins, amount')
          .eq('id', checkOrderId)
          .single();

        return new Response(JSON.stringify({
          success: true,
          status: paymentReq?.status || 'pending',
          total_coins: paymentReq?.total_coins,
          amount: paymentReq?.amount,
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
  
  const isSuccess = status === 'success' || status === 'SUCCESS' || status === 'true' || status === true;
  console.log(`Processing callback for ${orderId}, status: ${status}, isSuccess: ${isSuccess}`);

  // DUPLICATE PROTECTION: Fetch current status FIRST
  const { data: existingReq } = await supabase
    .from('upi_payment_requests')
    .select('status, user_id, total_coins, amount, bonus_coins')
    .eq('id', orderId)
    .single();

  if (!existingReq) {
    console.log(`Payment request ${orderId} not found`);
    return;
  }

  // If already completed, skip to prevent double-crediting
  if (existingReq.status === 'completed') {
    console.log(`Payment ${orderId} already completed, skipping duplicate callback`);
    return;
  }

  // Update payment request status
  await supabase
    .from('upi_payment_requests')
    .update({ status: isSuccess ? 'completed' : 'failed', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (!isSuccess) return;

  if (!existingReq.user_id) {
    console.log(`No user_id for payment ${orderId}`);
    return;
  }

  const totalCoins = Number(existingReq.total_coins || existingReq.amount);

  // Credit wallet
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', existingReq.user_id)
    .single();

  if (wallet) {
    const newBalance = wallet.balance + totalCoins;
    await supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', existingReq.user_id);
    
    console.log(`Wallet updated: ${wallet.balance} -> ${newBalance} for user ${existingReq.user_id}`);
  } else {
    // Create wallet if doesn't exist
    await supabase
      .from('wallets')
      .insert({ user_id: existingReq.user_id, balance: totalCoins });
    
    console.log(`Created wallet with ${totalCoins} coins for user ${existingReq.user_id}`);
  }

  // Record transaction
  await supabase
    .from('coin_transactions')
    .insert({
      user_id: existingReq.user_id,
      amount: totalCoins,
      type: 'credit',
      description: `Coin recharge via online payment (₹${existingReq.amount})`,
      reference_id: orderId,
    });

  console.log(`Auto-credited ${totalCoins} coins to user ${existingReq.user_id}`);
}
