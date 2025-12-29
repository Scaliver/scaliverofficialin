import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SMM_API_KEY = Deno.env.get('SMM_API_KEY');
const SMM_API_URL = Deno.env.get('SMM_API_URL');

interface SMMOrderRequest {
  service: string;  // SMM service ID
  link: string;     // Target link (profile/post URL)
  quantity: number; // Amount to order
}

interface SMMOrderResponse {
  order?: number;
  error?: string;
}

// Place order with SMM Panel
async function placeSMMOrder(data: SMMOrderRequest): Promise<SMMOrderResponse> {
  console.log('Placing SMM order:', data);
  
  const formData = new URLSearchParams();
  formData.append('key', SMM_API_KEY!);
  formData.append('action', 'add');
  formData.append('service', data.service);
  formData.append('link', data.link);
  formData.append('quantity', data.quantity.toString());

  const response = await fetch(SMM_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const result = await response.json();
  console.log('SMM API response:', result);
  return result;
}

// Get order status from SMM Panel
async function getOrderStatus(orderId: number): Promise<any> {
  const formData = new URLSearchParams();
  formData.append('key', SMM_API_KEY!);
  formData.append('action', 'status');
  formData.append('order', orderId.toString());

  const response = await fetch(SMM_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  return await response.json();
}

// Get available services from SMM Panel
async function getServices(): Promise<any> {
  const formData = new URLSearchParams();
  formData.append('key', SMM_API_KEY!);
  formData.append('action', 'services');

  const response = await fetch(SMM_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  return await response.json();
}

// Get account balance from SMM Panel
async function getBalance(): Promise<any> {
  const formData = new URLSearchParams();
  formData.append('key', SMM_API_KEY!);
  formData.append('action', 'balance');

  const response = await fetch(SMM_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API configuration
    if (!SMM_API_KEY || !SMM_API_URL) {
      console.error('SMM API not configured');
      return new Response(
        JSON.stringify({ error: 'SMM API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();
    console.log('SMM order request:', { action, params });

    let result;

    switch (action) {
      case 'order':
        // Place a new order
        const { service, link, quantity } = params;
        if (!service || !link || !quantity) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: service, link, quantity' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await placeSMMOrder({ service, link, quantity });
        break;

      case 'status':
        // Check order status
        const { orderId } = params;
        if (!orderId) {
          return new Response(
            JSON.stringify({ error: 'Missing orderId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getOrderStatus(orderId);
        break;

      case 'services':
        // Get available services
        result = await getServices();
        break;

      case 'balance':
        // Get account balance
        result = await getBalance();
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: order, status, services, or balance' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in smm-order function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
