import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderRequest {
  productId: string;
  userId: string;
  playerId: string;
  zoneId?: string;
  amount: string;
  price: number;
  productName: string;
  contactNumber: string;
  providerProductId?: string;
}

// Generate HMAC-SHA256 signature using Web Crypto API
async function generateSignature(payload: string, apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiKey);
  const messageData = encoder.encode(payload);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GAMETOPUP_API_KEY');
    const clientId = Deno.env.get('GAMETOPUP_CLIENT_ID');
    
    if (!apiKey || !clientId) {
      console.error('Missing API credentials');
      return new Response(
        JSON.stringify({ error: 'API credentials not configured', code: 500 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const body: OrderRequest = await req.json();
    const { productId, userId, playerId, zoneId, amount, price, productName, contactNumber, providerProductId } = body;

    console.log('Secure order request:', { productId, playerId, zoneId, productName });

    // Validate required fields
    if (!productId || !userId || !playerId || !amount || !price || !productName || !contactNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields', code: 400 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch API configuration from database
    const { data: apiConfig, error: apiError } = await supabase
      .from('smm_apis')
      .select('*')
      .eq('api_type', 'gametopup')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (apiError || !apiConfig) {
      console.error('API config error:', apiError);
      return new Response(
        JSON.stringify({ error: 'No active Game Top-Up API configured', code: 404 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const apiUrl = apiConfig.api_url.replace(/\/$/, '');
    console.log('Using API URL:', apiUrl);

    // Step 1: Validate user via check API
    const checkPayload = JSON.stringify({
      playerid: playerId,
      zoneid: zoneId || '',
    });

    const checkSignature = await generateSignature(checkPayload, apiKey);
    console.log('Check payload:', checkPayload);
    console.log('Check signature generated');

    let validateResponse;
    try {
      validateResponse = await fetch(`${apiUrl}/validate-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-client-id': clientId,
          'x-signature': checkSignature,
        },
        body: checkPayload,
      });
    } catch (fetchError) {
      console.error('Validate fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to connect to validation API', code: 503 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const validateText = await validateResponse.text();
    console.log('Validate response:', validateText);

    let validateResult;
    try {
      validateResult = JSON.parse(validateText);
    } catch {
      validateResult = { raw_response: validateText };
    }

    // Check if validation was successful
    const isValidUser = validateResult.statusCode === 200 || 
                        validateResult.success === true || 
                        validateResult.code === 200;

    if (!isValidUser) {
      return new Response(
        JSON.stringify({
          code: validateResult.statusCode || 400,
          success: false,
          error: validateResult.message || 'Player validation failed',
          message: 'Invalid Player ID or Zone ID'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const username = validateResult.data?.username || validateResult.username || 
                     validateResult.data?.nickname || validateResult.nickname || 'Unknown';

    console.log('User validated:', username);

    // Step 2: Create order via order API
    const orderPayload = JSON.stringify({
      playerid: playerId,
      zoneid: zoneId || '',
      productid: providerProductId || productId,
      currency: 'INR'
    });

    const orderSignature = await generateSignature(orderPayload, apiKey);
    console.log('Order payload:', orderPayload);
    console.log('Order signature generated');

    let orderResponse;
    try {
      orderResponse = await fetch(`${apiUrl}/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-client-id': clientId,
          'x-signature': orderSignature,
        },
        body: orderPayload,
      });
    } catch (fetchError) {
      console.error('Order fetch error:', fetchError);
      
      // Save as pending_manual for admin fulfillment
      const { data: savedOrder, error: saveError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          product_id: productId,
          product_name: productName,
          amount: amount,
          price: price,
          user_game_id: playerId,
          zone_id: zoneId || null,
          contact_number: contactNumber,
          status: 'pending_manual',
        })
        .select()
        .single();

      if (saveError) {
        console.error('Failed to save order:', saveError);
      }

      return new Response(
        JSON.stringify({ 
          error: 'Failed to connect to order API, saved for manual processing',
          code: 503,
          order_id: savedOrder?.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const orderText = await orderResponse.text();
    console.log('Order response:', orderText);

    let orderResult;
    try {
      orderResult = JSON.parse(orderText);
    } catch {
      orderResult = { raw_response: orderText };
    }

    // Determine order status
    const isOrderSuccess = orderResult.statusCode === 200 || 
                           orderResult.success === true || 
                           orderResult.code === 200;

    const externalOrderId = orderResult.data?.orderId || orderResult.orderId || 
                            orderResult.data?.order_id || orderResult.order_id || null;

    const orderStatus = isOrderSuccess ? 'processing' : 'pending_manual';

    // Step 3: Save order to database
    const { data: savedOrder, error: saveError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        product_id: productId,
        product_name: productName,
        amount: amount,
        price: price,
        user_game_id: playerId,
        zone_id: zoneId || null,
        contact_number: contactNumber,
        status: orderStatus,
        smm_order_id: externalOrderId,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save order to database:', saveError);
      return new Response(
        JSON.stringify({
          code: 500,
          success: false,
          error: 'Failed to save order to database',
          external_order: orderResult
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order saved:', savedOrder.id);

    // Return success response
    return new Response(
      JSON.stringify({
        code: 200,
        success: isOrderSuccess,
        order_id: savedOrder.id,
        external_order_id: externalOrderId,
        status: orderStatus,
        username: username,
        message: isOrderSuccess ? 'Order placed successfully' : 'Order saved for manual processing',
        data: orderResult.data || orderResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Secure order error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage, code: 500 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
