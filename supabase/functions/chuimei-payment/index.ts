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

  try {
    const apiToken = Deno.env.get('CHUIMEI_API_TOKEN');
    if (!apiToken) {
      return new Response(JSON.stringify({ success: false, error: 'Chuimei API token not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, amount, order_id, customer_mobile, redirect_url, remark1, remark2 } = body;

    if (!action) {
      return new Response(JSON.stringify({ success: false, error: 'Action is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (action) {
      case 'create_order': {
        if (!amount || amount < 1) {
          return new Response(JSON.stringify({ success: false, error: 'Minimum amount is ₹1' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!order_id) {
          return new Response(JSON.stringify({ success: false, error: 'order_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!customer_mobile) {
          return new Response(JSON.stringify({ success: false, error: 'customer_mobile is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Build form-encoded payload as per Chuimei-pe API docs
        const formData = new URLSearchParams();
        formData.append('customer_mobile', customer_mobile);
        formData.append('user_token', apiToken);
        formData.append('amount', String(amount));
        formData.append('order_id', order_id);
        formData.append('redirect_url', redirect_url || `${supabaseUrl}/functions/v1/chuimei-payment?action=callback`);
        if (remark1) formData.append('remark1', remark1);
        if (remark2) formData.append('remark2', remark2);

        console.log('Chuimei-pe create order:', { order_id, amount, customer_mobile });

        const response = await fetch(CHUIMEI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        const responseText = await response.text();
        console.log('Chuimei-pe response:', responseText);

        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          return new Response(JSON.stringify({
            success: false,
            error: `Invalid API response: ${responseText.substring(0, 200)}`,
          }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Chuimei-pe returns: { status: true, result: { orderId, payment_url } }
        if (result.status === true || result.status === 'true') {
          const paymentUrl = result.result?.payment_url || result.payment_url || result.data?.payment_url || result.url;
          return new Response(JSON.stringify({
            success: true,
            payment_url: paymentUrl,
            order_id: order_id,
            data: result,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({
          success: false,
          error: result.message || result.error || 'Payment order creation failed',
          data: result,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'callback': {
        // Handle payment callback/webhook from Chuimei-pe
        console.log('Chuimei-pe callback received:', body);
        
        const callbackOrderId = body.order_id || body.orderId;
        const paymentStatus = body.status || body.payment_status;
        
        if (callbackOrderId && paymentStatus) {
          // Update relevant records based on the order type
          // Check if it's a coin recharge or product order
          const { error: updateError } = await supabase
            .from('upi_payment_requests')
            .update({ 
              status: paymentStatus === 'success' ? 'completed' : 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', callbackOrderId);
          
          if (updateError) {
            console.error('Failed to update payment status:', updateError);
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unknown action "${action}". Valid: create_order, callback`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Chuimei payment error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
