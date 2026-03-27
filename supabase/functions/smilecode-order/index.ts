import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SMILECODE_BASE_URL = 'https://www.smile.one/smilecode/api/';

type ActionType =
  | 'balance'
  | 'products'
  | 'sku_list'
  | 'validate'
  | 'send_order'
  | 'order_detail';

interface SmileCodeRequest {
  action: ActionType;
  apiGame?: string;
  sku?: string;
  qty?: number;
  user_id?: string;
  server_id?: string;
  order_id?: string;
  // For database operations
  supabase_user_id?: string;
  product_name?: string;
  amount?: string;
  price?: number;
  contact_number?: string;
  product_id?: string;
  zone_id?: string;
}

// Generate a unique request ID
function generateRequestId(): string {
  return `SC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// Build JWT and make SmileCode API request
async function makeSmileCodeRequest(
  method: string,
  params: Record<string, unknown>,
  apiKey: string,
  uid: string,
  secretKey: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const iat = Math.floor(Date.now() / 1000);
  const requestId = generateRequestId();

  // Add iat to params
  const fullParams = { iat, uid, ...params };

  const payload = {
    jsonrpc: "2.0",
    id: requestId,
    method,
    params: fullParams,
  };

  // JWT header with custom SmileCode fields
  const header = {
    alg: "HS256" as const,
    typ: "JWT",
    "sc-api-key": apiKey,
    "sc-api-version": "2.0",
  };

  try {
    // Import the secret key for HMAC signing
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    // Create JWT token
    const token = await create(header, payload, key);

    console.log('SmileCode Request:', { method, params: fullParams, requestId });

    // Make API request
    const response = await fetch(SMILECODE_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Sc-Api-Key': apiKey,
        'Sc-Api-Version': '2.0',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('SmileCode Response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      return { success: false, error: `Invalid response: ${responseText}` };
    }

    // Check for JSON-RPC errors
    if (result.error) {
      return {
        success: false,
        error: result.error.message || `Error code: ${result.error.code}`,
        data: result,
      };
    }

    // Check result code (100000 = success per SmileOne docs)
    const resultCode = result.result?.code || result.code;
    if (resultCode && resultCode !== 100000) {
      return {
        success: false,
        error: result.result?.message || `API error code: ${resultCode}`,
        data: result,
      };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('SmileCode API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// JSON response helper
function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ success: false, error: message }, status);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('SMILECODE_API_KEY');
    const uid = Deno.env.get('SMILECODE_UID');
    const secretKey = Deno.env.get('SMILECODE_SECRET_KEY');

    if (!apiKey || !uid || !secretKey) {
      console.error('Missing SmileCode credentials');
      return errorResponse('SmileCode API credentials not configured', 500);
    }

    let body: SmileCodeRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON body');
    }

    const { action } = body;
    if (!action) return errorResponse('Action is required');

    console.log('SmileCode request:', { action, body });

    // Initialize Supabase client for DB operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (action) {
      // 1. Balance
      case 'balance': {
        const result = await makeSmileCodeRequest('balance', {}, apiKey, uid, secretKey);
        return jsonResponse({
          success: result.success,
          balance: (result.data as any)?.result?.usd_balance ?? null,
          data: result.data,
          error: result.error,
        });
      }

      // 2. Product List
      case 'products': {
        const result = await makeSmileCodeRequest('productList', {}, apiKey, uid, secretKey);
        const productList = (result.data as any)?.result?.productList || [];
        return jsonResponse({
          success: result.success,
          products: productList,
          error: result.error,
        });
      }

      // 3. SKU List
      case 'sku_list': {
        if (!body.apiGame) return errorResponse('apiGame is required');
        const result = await makeSmileCodeRequest('skuList', { apiGame: body.apiGame }, apiKey, uid, secretKey);
        const skuData = (result.data as any)?.result || {};
        return jsonResponse({
          success: result.success,
          skuList: skuData.skuList || [],
          serverList: skuData.serverList || [],
          isMultiPurchase: skuData.isMultiPurchase ?? false,
          error: result.error,
        });
      }

      // 4. Validate Player
      case 'validate': {
        if (!body.apiGame || !body.user_id) {
          return errorResponse('apiGame and user_id are required');
        }

        const userAccount: Record<string, string> = { user_id: body.user_id };
        if (body.server_id) userAccount.server_id = body.server_id;

        const result = await makeSmileCodeRequest('validate', {
          apiGame: body.apiGame,
          userAccount,
        }, apiKey, uid, secretKey);

        const resultData = (result.data as any)?.result || {};
        return jsonResponse({
          success: result.success,
          valid: result.success && resultData.code === 100000,
          username: resultData.username || null,
          userAccount: resultData.userAccount || null,
          message: resultData.message || null,
          error: result.error,
        });
      }

      // 5. Send Order
      case 'send_order': {
        const { apiGame, sku, qty, user_id, server_id, supabase_user_id, product_name, amount, price, contact_number, product_id, zone_id } = body;

        if (!apiGame || !sku || !user_id) {
          return errorResponse('apiGame, sku, and user_id are required');
        }

        // Build userAccount
        const userAccount: Record<string, string> = { user_id };
        if (server_id) userAccount.server_id = server_id;

        // Build order params per SmileOne docs
        const orderParams: Record<string, unknown> = {
          apiGame,
          items: [{ sku, qty: qty || 1 }],
          userAccount,
        };

        console.log('Sending SmileCode order:', orderParams);
        const orderResult = await makeSmileCodeRequest('sendOrder', orderParams, apiKey, uid, secretKey);

        const orderData = (orderResult.data as any) || {};
        const externalOrderId = orderData.orderId || orderData.result?.orderId || null;
        const orderStatus = orderResult.success ? 'processing' : 'pending_manual';

        // Save order to database
        let savedOrder = null;
        if (supabase_user_id) {
          const { data, error: saveError } = await supabase
            .from('orders')
            .insert({
              user_id: supabase_user_id,
              product_id: product_id || apiGame,
              product_name: product_name || 'Unknown Product',
              amount: amount || 'N/A',
              price: price || 0,
              user_game_id: user_id,
              zone_id: zone_id || server_id || null,
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
          message: orderResult.success ? 'Order created successfully' : 'Order saved for manual processing',
          data: orderResult.data,
          error: orderResult.error,
        });
      }

      // 6. Order Detail
      case 'order_detail': {
        if (!body.order_id) return errorResponse('order_id is required');

        const result = await makeSmileCodeRequest('orderDetail', {
          orderId: body.order_id,
        }, apiKey, uid, secretKey);

        const resultData = (result.data as any)?.result || {};
        const status = resultData.status;

        // Update order status in DB if we have a match
        if (result.success && status) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: String(status).toLowerCase(),
              updated_at: new Date().toISOString(),
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
          error: result.error,
        });
      }

      default: {
        const validActions: ActionType[] = ['balance', 'products', 'sku_list', 'validate', 'send_order', 'order_detail'];
        return errorResponse(`Unknown action "${action}". Valid: ${validActions.join(', ')}`);
      }
    }
  } catch (error: unknown) {
    console.error('SmileCode API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return jsonResponse({ success: false, error: errorMessage }, 500);
  }
});
