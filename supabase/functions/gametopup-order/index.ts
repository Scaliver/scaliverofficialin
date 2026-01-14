import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GameTopUpOrderRequest {
  action: 'order' | 'products' | 'status' | 'test' | 'validate';
  apiId?: string;
  playerId?: string;
  zoneId?: string;
  productId?: string;
  orderId?: string;
  currency?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: GameTopUpOrderRequest = await req.json();
    const { action, apiId, playerId, zoneId, productId, orderId, currency = 'INR' } = body;

    console.log('Game Top-Up request:', { action, apiId, productId, playerId, zoneId });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch API configuration
    let apiConfig;
    if (apiId) {
      const { data, error } = await supabase
        .from('smm_apis')
        .select('*')
        .eq('id', apiId)
        .eq('api_type', 'gametopup')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('API config error:', error);
        return new Response(
          JSON.stringify({ error: 'API configuration not found or inactive', code: 404 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      apiConfig = data;
    } else {
      // Get first active gametopup API
      const { data, error } = await supabase
        .from('smm_apis')
        .select('*')
        .eq('api_type', 'gametopup')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'No active Game Top-Up API found', code: 404 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      apiConfig = data;
    }

    const apiUrl = apiConfig.api_url.replace(/\/$/, ''); // Remove trailing slash
    const apiKey = apiConfig.api_key;

    console.log('Using API:', { name: apiConfig.name, url: apiUrl });

    // Test action - just verify API is configured
    if (action === 'test') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Game Top-Up API configured',
          api_name: apiConfig.name,
          api_url: apiUrl 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate player (check username)
    if (action === 'validate') {
      if (!playerId || !zoneId) {
        return new Response(
          JSON.stringify({ error: 'playerId and zoneId are required', code: 400 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      try {
        // Call the validate-user endpoint
        const response = await fetch(`${apiUrl}/validate-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            playerid: playerId,
            zoneid: zoneId,
          }),
        });

        const responseText = await response.text();
        console.log('Validate response:', responseText);

        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          result = { raw_response: responseText };
        }

        // Map response to standard format
        if (result.statusCode === 200 || result.success) {
          return new Response(
            JSON.stringify({
              code: 200,
              success: true,
              username: result.data?.username || result.username || result.data?.nickname || result.nickname,
              region: result.data?.region || result.region || result.data?.server || result.server,
              zone_name: result.data?.zone_name || result.zone_name,
              message: 'Player validated successfully',
              data: result.data
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({
              code: result.statusCode || 400,
              success: false,
              error: result.message || result.error || 'Validation failed',
              message: result.message || 'Invalid Player ID or Zone ID'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (fetchError: unknown) {
        console.error('Validate fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        return new Response(
          JSON.stringify({ error: `Validation request failed: ${errorMessage}`, code: 500 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    // Create order
    if (action === 'order') {
      if (!playerId || !productId) {
        return new Response(
          JSON.stringify({ error: 'playerId and productId are required', code: 400 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      const orderPayload = {
        playerid: playerId,
        zoneid: zoneId || '',
        productid: productId,
        currency: currency
      };

      console.log('Placing order:', orderPayload);

      try {
        const response = await fetch(`${apiUrl}/order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify(orderPayload),
        });

        const responseText = await response.text();
        console.log('Order response:', responseText);

        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          result = { raw_response: responseText };
        }

        // Map response to standard format
        if (result.statusCode === 200 || result.success) {
          return new Response(
            JSON.stringify({
              code: 200,
              success: true,
              order_id: result.data?.orderId || result.orderId,
              status: result.data?.status || result.status,
              message: result.message || 'Order placed successfully',
              data: result.data
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({
              code: result.statusCode || 400,
              success: false,
              error: result.message || result.error || 'Order failed',
              data: result
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (fetchError: unknown) {
        console.error('Fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        return new Response(
          JSON.stringify({ error: `API request failed: ${errorMessage}`, code: 500 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    // Fetch products (if API supports it)
    if (action === 'products') {
      try {
        const response = await fetch(`${apiUrl}/products`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
        });

        const responseText = await response.text();
        console.log('Products response:', responseText);

        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          result = { raw_response: responseText };
        }

        return new Response(
          JSON.stringify({
            code: 200,
            success: true,
            products: result.data || result.products || result,
            message: 'Products fetched'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: unknown) {
        console.error('Products fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        return new Response(
          JSON.stringify({ error: `Failed to fetch products: ${errorMessage}`, code: 500 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    // Check order status
    if (action === 'status') {
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'orderId is required', code: 400 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      try {
        const response = await fetch(`${apiUrl}/order/${orderId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
        });

        const responseText = await response.text();
        console.log('Status response:', responseText);

        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          result = { raw_response: responseText };
        }

        return new Response(
          JSON.stringify({
            code: 200,
            success: true,
            order: result.data || result,
            message: 'Status fetched'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchError: unknown) {
        console.error('Status fetch error:', fetchError);
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        return new Response(
          JSON.stringify({ error: `Failed to fetch status: ${errorMessage}`, code: 500 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action', code: 400 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage, code: 500 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
