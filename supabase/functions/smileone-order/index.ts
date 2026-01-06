import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SmileOne API endpoints
const SMILEONE_BASE_URL = "https://www.smile.one/smilecoin/api";

// Generate MD5 hash using Deno standard library
function md5(input: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = crypto.subtle.digestSync("MD5", data);
  const hexBytes = encodeHex(new Uint8Array(hashBuffer));
  return new TextDecoder().decode(hexBytes);
}

// Generate SmileOne signature using double MD5
function generateSign(params: Record<string, string>, key: string): string {
  // Sort parameters alphabetically
  const sortedKeys = Object.keys(params).sort();
  
  // Build query string: key1=value1&key2=value2&
  const str = sortedKeys.map(k => `${k}=${params[k]}`).join('&') + '&';
  
  // Append key and double MD5 hash
  const textToHash = str + key;
  
  // First MD5
  const firstMd5 = md5(textToHash);
  
  // Second MD5
  const secondMd5 = md5(firstMd5);
  
  return secondMd5;
}

// Fetch products from SmileOne
async function getProducts(uid: string, email: string, key: string, productType: string = "mobilelegends"): Promise<any> {
  const params: Record<string, string> = {
    uid,
    email,
    product: productType,
  };
  
  const sign = generateSign(params, key);
  params.sign = sign;
  
  const formData = new URLSearchParams(params);
  
  const response = await fetch(`${SMILEONE_BASE_URL}/productlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  return await response.json();
}

// Validate player ID and get role info
async function validatePlayer(uid: string, email: string, key: string, userId: string, zoneId: string, productType: string = "mobilelegends"): Promise<any> {
  const params: Record<string, string> = {
    uid,
    email,
    product: productType,
    userid: userId,
    zoneid: zoneId,
  };
  
  const sign = generateSign(params, key);
  params.sign = sign;
  
  const formData = new URLSearchParams(params);
  
  const response = await fetch(`${SMILEONE_BASE_URL}/getrole`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  return await response.json();
}

// Create order on SmileOne
async function createOrder(
  uid: string, 
  email: string, 
  key: string, 
  userId: string, 
  zoneId: string, 
  productId: string,
  productType: string = "mobilelegends"
): Promise<any> {
  const params: Record<string, string> = {
    uid,
    email,
    product: productType,
    userid: userId,
    zoneid: zoneId,
    productid: productId,
    time: Math.floor(Date.now() / 1000).toString(),
  };
  
  const sign = generateSign(params, key);
  params.sign = sign;
  
  const formData = new URLSearchParams(params);
  
  console.log('Creating SmileOne order with params:', { ...params, sign: '[HIDDEN]' });
  
  const response = await fetch(`${SMILEONE_BASE_URL}/createorder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  const result = await response.json();
  console.log('SmileOne order response:', result);
  
  return result;
}

// Get account balance
async function getBalance(uid: string, email: string, key: string): Promise<any> {
  const params: Record<string, string> = {
    uid,
    email,
  };
  
  const sign = generateSign(params, key);
  params.sign = sign;
  
  const formData = new URLSearchParams(params);
  
  const response = await fetch(`${SMILEONE_BASE_URL}/getbalance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, apiId, userId, zoneId, productId, productType = "mobilelegends" } = await req.json();
    
    console.log('SmileOne request:', { action, apiId, userId, zoneId, productId, productType });

    // Initialize Supabase client with service role for accessing smm_apis table
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API credentials from database
    let apiCredentials;
    
    if (apiId) {
      // Get specific API by ID
      const { data, error } = await supabase
        .from('smm_apis')
        .select('*')
        .eq('id', apiId)
        .eq('api_type', 'smileone')
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'SmileOne API configuration not found or inactive' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      apiCredentials = data;
    } else {
      // Get first active SmileOne API
      const { data, error } = await supabase
        .from('smm_apis')
        .select('*')
        .eq('api_type', 'smileone')
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'No active SmileOne API configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      apiCredentials = data;
    }

    const { api_url: uid, api_key: key, email } = apiCredentials;
    
    if (!uid || !key || !email) {
      return new Response(
        JSON.stringify({ error: 'SmileOne API credentials incomplete. Need UID, Email, and Secret Key.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'products':
        result = await getProducts(uid, email, key, productType);
        break;
        
      case 'validate':
        if (!userId || !zoneId) {
          return new Response(
            JSON.stringify({ error: 'userId and zoneId are required for validation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await validatePlayer(uid, email, key, userId, zoneId, productType);
        break;
        
      case 'order':
        if (!userId || !zoneId || !productId) {
          return new Response(
            JSON.stringify({ error: 'userId, zoneId, and productId are required to create an order' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await createOrder(uid, email, key, userId, zoneId, productId, productType);
        break;
        
      case 'balance':
        result = await getBalance(uid, email, key);
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}. Valid actions: products, validate, order, balance` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('SmileOne function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
