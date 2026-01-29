import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MATRIX_SOLS_BASE_URL = 'https://matrixsols.in/api/digital-top-ups';

// Valid actions for the edge function
type ActionType = 
  | 'wallet_balance'
  | 'products' 
  | 'product_items' 
  | 'product_servers'
  | 'check_id' 
  | 'create_order' 
  | 'order_details';

interface DigitalTopupRequest {
  action: ActionType;
  category?: string;
  product_id?: string;
  item_id?: string;
  user_id?: string;
  server?: string;
  server_region?: string;
  order_id?: string;
  // For database operations
  supabase_user_id?: string;
  product_name?: string;
  amount?: string;
  price?: number;
  contact_number?: string;
}

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  status?: number;
}

// Generate HMAC-SHA256 signature using Web Crypto API
async function generateSignature(payload: string, apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Signature string format: API_KEY + ";" + serialized JSON payload
  const signatureString = `${apiKey};${payload}`;
  
  // Create HMAC-SHA256 using API_KEY as the key
  const keyData = encoder.encode(apiKey);
  const messageData = encoder.encode(signatureString);
  
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

// Make authenticated request to Matrix Sols API
async function makeApiRequest(
  endpoint: string, 
  payload: Record<string, unknown>, 
  apiKey: string, 
  clientId: string
): Promise<ApiResponse> {
  // Convert payload to compact JSON (no spaces)
  const compactPayload = JSON.stringify(payload);
  
  // Generate new signature for this request
  const signature = await generateSignature(compactPayload, apiKey);
  
  console.log('Matrix Sols Request:', {
    endpoint,
    payload: compactPayload,
    signatureGenerated: true
  });

  try {
    const response = await fetch(`${MATRIX_SOLS_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Client-Id': clientId,
      },
      body: compactPayload,
    });

    const responseText = await response.text();
    console.log('Matrix Sols Response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw_response: responseText };
    }

    if (!response.ok) {
      return {
        success: false,
        error: result.message || result.error || `HTTP ${response.status}`,
        status: response.status,
        data: result
      };
    }

    return {
      success: true,
      data: result,
      status: response.status
    };
  } catch (error) {
    console.error('Matrix Sols fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      status: 503
    };
  }
}

// JSON response helper
function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status
  });
}

// Error response helper
function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ success: false, error: message }, status);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get credentials from environment
    const apiKey = Deno.env.get('MATRIX_API_KEY');
    const clientId = Deno.env.get('MATRIX_CLIENT_ID');
    
    if (!apiKey || !clientId) {
      console.error('Missing Matrix Sols API credentials');
      return jsonResponse({ 
        success: false, 
        error: 'API credentials not configured' 
      });
    }

    // Parse request body
    let body: DigitalTopupRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON body');
    }

    const { action } = body;

    if (!action) {
      return errorResponse('Action is required');
    }

    console.log('Digital Topup request:', { action, body });

    // Initialize Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Route based on action
    switch (action) {
      // 1. Wallet Balance
      case 'wallet_balance': {
        const result = await makeApiRequest('/balance/', {}, apiKey, clientId);
        return jsonResponse({
          success: result.success,
          balance: result.data,
          error: result.error
        });
      }

      // 2. Product List (Games)
      case 'products': {
        const category = body.category || 'Gaming';
        const result = await makeApiRequest('/products_list/', { category }, apiKey, clientId);
        return jsonResponse({
          success: result.success,
          products: result.data,
          error: result.error
        });
      }

      // 3. Product Items (Packages)
      case 'product_items': {
        if (!body.product_id) {
          return errorResponse('product_id is required');
        }
        const result = await makeApiRequest(
          '/product_items_list/', 
          { product_id: body.product_id }, 
          apiKey, 
          clientId
        );
        return jsonResponse({
          success: result.success,
          items: result.data,
          error: result.error
        });
      }

      // 4. Product Servers
      case 'product_servers': {
        if (!body.product_id) {
          return errorResponse('product_id is required');
        }
        const result = await makeApiRequest(
          '/product_server_list/', 
          { product_id: body.product_id }, 
          apiKey, 
          clientId
        );
        return jsonResponse({
          success: result.success,
          servers: result.data,
          error: result.error
        });
      }

      // 5. Check User ID (Before Order)
      case 'check_id': {
        if (!body.product_id || !body.user_id) {
          return errorResponse('product_id and user_id are required');
        }

        const payload: Record<string, string> = {
          product_id: body.product_id,
          user_id: body.user_id,
        };

        // Add optional server fields only if provided
        if (body.server) payload.server = body.server;
        if (body.server_region) payload.server_region = body.server_region;

        const result = await makeApiRequest('/check_id/', payload, apiKey, clientId);
        
        // Extract username and region from response
        const responseData = result.data as Record<string, unknown> | undefined;
        const username = responseData?.username || responseData?.name || responseData?.nickname;
        const region = responseData?.region || responseData?.server || responseData?.zone;

        return jsonResponse({
          success: result.success,
          valid: result.success,
          username,
          region,
          data: result.data,
          error: result.error
        });
      }

      // 6. Create Order (Automatic)
      case 'create_order': {
        const { product_id, item_id, user_id, server, server_region, supabase_user_id, product_name, amount, price, contact_number } = body;

        if (!product_id || !item_id || !user_id) {
          return errorResponse('product_id, item_id, and user_id are required');
        }

        // Step 1: Validate user first
        const checkPayload: Record<string, string> = { product_id, user_id };
        if (server) checkPayload.server = server;
        if (server_region) checkPayload.server_region = server_region;

        console.log('Validating user before order...');
        const checkResult = await makeApiRequest('/check_id/', checkPayload, apiKey, clientId);
        
        if (!checkResult.success) {
          // Save as pending_manual if validation fails
          if (supabase_user_id) {
            await supabase.from('orders').insert({
              user_id: supabase_user_id,
              product_id: product_id,
              product_name: product_name || 'Unknown Product',
              amount: amount || 'N/A',
              price: price || 0,
              user_game_id: user_id,
              zone_id: server || null,
              contact_number: contact_number || '',
              status: 'pending_manual',
            });
          }

          return jsonResponse({
            success: false,
            error: checkResult.error || 'User validation failed',
            message: 'Invalid User ID or Server'
          });
        }

        const checkData = checkResult.data as Record<string, unknown> | undefined;
        const username = checkData?.username || checkData?.name || checkData?.nickname || 'Unknown';

        // Step 2: Create the order
        const orderPayload: Record<string, string> = {
          product_id,
          item_id,
          user_id,
        };
        if (server) orderPayload.server = server;
        if (server_region) orderPayload.server_region = server_region;

        console.log('Creating order...');
        const orderResult = await makeApiRequest('/create_order/', orderPayload, apiKey, clientId);

        const orderData = orderResult.data as Record<string, unknown> | undefined;
        const externalOrderId = orderData?.order_id || orderData?.orderId || null;
        const orderStatus = orderResult.success ? 'processing' : 'pending_manual';

        // Step 3: Save order to Supabase database
        let savedOrder = null;
        if (supabase_user_id) {
          const { data, error: saveError } = await supabase
            .from('orders')
            .insert({
              user_id: supabase_user_id,
              product_id: product_id,
              product_name: product_name || 'Unknown Product',
              amount: amount || 'N/A',
              price: price || 0,
              user_game_id: user_id,
              zone_id: server || null,
              contact_number: contact_number || '',
              status: orderStatus,
              smm_order_id: externalOrderId ? String(externalOrderId) : null,
            })
            .select()
            .single();

          if (saveError) {
            console.error('Failed to save order:', saveError);
          } else {
            savedOrder = data;
          }
        }

        return jsonResponse({
          success: orderResult.success,
          order_id: savedOrder?.id,
          external_order_id: externalOrderId,
          status: orderStatus,
          username,
          message: orderResult.success ? 'Order created successfully' : 'Order saved for manual processing',
          data: orderResult.data,
          error: orderResult.error
        });
      }

      // 7. Track Order
      case 'order_details': {
        if (!body.order_id) {
          return errorResponse('order_id is required');
        }

        const result = await makeApiRequest(
          '/order_details/', 
          { order_id: body.order_id }, 
          apiKey, 
          clientId
        );

        const orderData = result.data as Record<string, unknown> | undefined;
        const status = orderData?.status || orderData?.order_status;

        // Update order status in database if we have an smm_order_id match
        if (result.success && status) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
              status: String(status).toLowerCase(),
              updated_at: new Date().toISOString()
            })
            .eq('smm_order_id', body.order_id);

          if (updateError) {
            console.error('Failed to update order status:', updateError);
          }
        }

        return jsonResponse({
          success: result.success,
          order: result.data,
          status,
          error: result.error
        });
      }

      // Unknown action
      default: {
        const validActions: ActionType[] = [
          'wallet_balance',
          'products',
          'product_items',
          'product_servers',
          'check_id',
          'create_order',
          'order_details'
        ];
        return errorResponse(
          `Unknown action "${action}". Valid actions: ${validActions.join(', ')}`
        );
      }
    }

  } catch (error: unknown) {
    console.error('Digital Topup API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return jsonResponse({ 
      success: false, 
      error: errorMessage 
    });
  }
});
