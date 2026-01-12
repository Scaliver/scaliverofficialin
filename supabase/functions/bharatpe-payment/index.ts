import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentGatewayConfig {
  api_key: string;
  merchant_id: string;
  gateway_type: string;
}

// Get payment gateway config from database
async function getPaymentGatewayConfig(supabase: any): Promise<PaymentGatewayConfig | null> {
  const { data, error } = await supabase
    .from('smm_apis')
    .select('api_key, api_url, email')
    .eq('api_type', 'payment')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching payment gateway config:', error);
    return null;
  }

  return {
    api_key: data.api_key,
    merchant_id: data.email || '',
    gateway_type: data.api_url || 'bharatpe',
  };
}

// Verify payment using UTR number
async function verifyPayment(
  config: PaymentGatewayConfig,
  utrNumber: string,
  amount: number
): Promise<{ verified: boolean; message: string; transactionId?: string }> {
  const { gateway_type, api_key, merchant_id } = config;

  // BharatPe verification - this is a placeholder implementation
  // Real implementation would depend on BharatPe's actual API
  if (gateway_type === 'bharatpe') {
    try {
      // BharatPe doesn't have a public API for UTR verification
      // This would need to be implemented based on their merchant API
      // For now, we log the attempt and return a pending status
      console.log('BharatPe verification attempt:', { utrNumber, amount, merchant_id });
      
      // In production, you would call BharatPe's API here
      // const response = await fetch('https://api.bharatpe.com/v1/verify', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${api_key}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ utr: utrNumber, amount, merchant_id }),
      // });
      
      return {
        verified: false,
        message: 'Payment verification pending - manual approval required',
      };
    } catch (error) {
      console.error('BharatPe verification error:', error);
      return {
        verified: false,
        message: 'Verification failed - please contact support',
      };
    }
  }

  // Razorpay verification
  if (gateway_type === 'razorpay') {
    try {
      // Razorpay payment fetch API
      const response = await fetch(`https://api.razorpay.com/v1/payments/${utrNumber}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${merchant_id}:${api_key}`)}`,
        },
      });

      if (response.ok) {
        const payment = await response.json();
        if (payment.status === 'captured' && payment.amount === amount * 100) {
          return {
            verified: true,
            message: 'Payment verified successfully',
            transactionId: payment.id,
          };
        }
      }
      
      return {
        verified: false,
        message: 'Payment not found or amount mismatch',
      };
    } catch (error) {
      console.error('Razorpay verification error:', error);
      return {
        verified: false,
        message: 'Verification failed',
      };
    }
  }

  return {
    verified: false,
    message: 'Unknown payment gateway type',
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, utrNumber, amount, requestId } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get payment gateway config
    const config = await getPaymentGatewayConfig(supabase);
    
    if (!config) {
      return new Response(
        JSON.stringify({ 
          error: 'No active payment gateway configured',
          configured: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'verify': {
        if (!utrNumber || !amount) {
          return new Response(
            JSON.stringify({ error: 'UTR number and amount are required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        const result = await verifyPayment(config, utrNumber, amount);

        // If verified and requestId provided, update the payment request
        if (result.verified && requestId) {
          await supabase
            .from('upi_payment_requests')
            .update({ 
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', requestId);
        }

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'status': {
        // Return gateway configuration status
        return new Response(
          JSON.stringify({
            configured: true,
            gateway_type: config.gateway_type,
            merchant_id: config.merchant_id ? '***' + config.merchant_id.slice(-4) : 'not set',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'test': {
        // Test gateway connection
        return new Response(
          JSON.stringify({
            success: true,
            message: `Payment gateway (${config.gateway_type}) is configured`,
            gateway_type: config.gateway_type,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('Payment gateway error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});