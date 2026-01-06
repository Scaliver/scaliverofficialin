import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeSmileOneBaseUrl(input: string): string {
  // Ensure no trailing slash and work around DNS issues in some edge runtimes
  try {
    const u = new URL(input);
    if (u.hostname === "api.smile.one") u.hostname = "www.smile.one";
    return u.toString().replace(/\/$/, "");
  } catch {
    return input.replace(/\/$/, "");
  }
}

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

// Helper to safely parse JSON response, handling HTML-wrapped JSON
async function safeJsonParse(response: Response, context: string): Promise<any> {
  const text = await response.text();
  
  console.log(`[${context}] Response status: ${response.status}`);
  console.log(`[${context}] Response text (first 500 chars): ${text.substring(0, 500)}`);
  
  // Try to extract JSON from HTML-wrapped responses (SmileOne sometimes returns <html><body>{...}</body></html>)
  let jsonText = text.trim();
  
  if (jsonText.startsWith('<')) {
    // Try to find JSON inside HTML
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
      console.log(`[${context}] Extracted JSON from HTML: ${jsonText.substring(0, 200)}`);
    } else {
      throw new Error(`API returned HTML without JSON content. Status: ${response.status}`);
    }
  }
  
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`Failed to parse JSON response: ${jsonText.substring(0, 200)}`);
  }
}

// Fetch products from SmileOne
async function getProducts(apiUrl: string, uid: string, email: string, key: string, productType: string = "mobilelegends"): Promise<any> {
  const params: Record<string, string> = {
    uid,
    email,
    product: productType,
    time: Math.floor(Date.now() / 1000).toString(),
  };
  
  const sign = generateSign(params, key);
  params.sign = sign;
  
  const formData = new URLSearchParams(params);
  const endpoint = `${apiUrl}/productlist`;
  
  console.log('Fetching products from:', endpoint);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  return await safeJsonParse(response, 'getProducts');
}

// Validate player ID and get role info
async function validatePlayer(apiUrl: string, uid: string, email: string, key: string, userId: string, zoneId: string, productType: string = "mobilelegends"): Promise<any> {
  const params: Record<string, string> = {
    uid,
    email,
    product: productType,
    userid: userId,
    zoneid: zoneId,
    time: Math.floor(Date.now() / 1000).toString(),
  };
  
  const sign = generateSign(params, key);
  params.sign = sign;
  
  const formData = new URLSearchParams(params);
  const endpoint = `${apiUrl}/getrole`;
  
  console.log('Validating player at:', endpoint);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  return await safeJsonParse(response, 'validatePlayer');
}

// Create order on SmileOne
async function createOrder(
  apiUrl: string,
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
  const endpoint = `${apiUrl}/createorder`;
  
  console.log('Creating SmileOne order at:', endpoint);
  console.log('Order params:', { ...params, sign: '[HIDDEN]' });
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  const result = await safeJsonParse(response, 'createOrder');
  console.log('SmileOne order response:', result);
  
  return result;
}

// Get account balance
async function getBalance(apiUrl: string, uid: string, email: string, key: string): Promise<any> {
  const params: Record<string, string> = {
    uid,
    email,
    time: Math.floor(Date.now() / 1000).toString(),
  };
  
  const sign = generateSign(params, key);
  params.sign = sign;
  
  const formData = new URLSearchParams(params);
  const endpoint = `${apiUrl}/getbalance`;
  
  console.log('Getting balance from:', endpoint);
  console.log('Balance params:', { uid, email, sign: '[HIDDEN]' });
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  return await safeJsonParse(response, 'getBalance');
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
        .maybeSingle();
      
      if (error) {
        console.error('Database error:', error);
        throw new Error('Database error: ' + error.message);
      }
      
      if (!data) {
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
        .maybeSingle();
      
      if (error) {
        console.error('Database error:', error);
        throw new Error('Database error: ' + error.message);
      }
      
      if (!data) {
        return new Response(
          JSON.stringify({ error: 'No active SmileOne API configured. Please add a SmileOne API in the admin panel.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      apiCredentials = data;
    }

    // For SmileOne: api_url stores the base API URL, api_key stores the secret key
    const apiUrl = apiCredentials.api_url;
    const uid = apiCredentials.name; // Using name field for UID since we don't have a dedicated field
    const email = apiCredentials.email;
    const key = apiCredentials.api_key;
    
    console.log('API credentials found:', { 
      id: apiCredentials.id, 
      name: apiCredentials.name,
      apiUrl: apiUrl,
      email: email,
      hasKey: !!key 
    });
    
    if (!apiUrl || !key || !email) {
      return new Response(
        JSON.stringify({ 
          error: 'SmileOne API credentials incomplete. Required: API URL (base endpoint), Email, and Secret Key.',
          details: {
            hasApiUrl: !!apiUrl,
            hasEmail: !!email,
            hasKey: !!key
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract UID from the API name or use a dedicated field approach
    // For now, we'll require the UID to be stored in the api_url field format: "uid|https://api.endpoint.com"
    // Or we can use a simple approach where api_url IS the UID
    let actualUid = apiUrl;
    let actualApiUrl = 'https://www.smile.one/smilecoin/api';
    
    // Check if api_url contains a custom endpoint (if it starts with http)
    if (apiUrl.startsWith('http')) {
      actualApiUrl = apiUrl;
      // In this case, we need the UID from somewhere - use the name field
      actualUid = apiCredentials.name;
    } else {
      // api_url field stores the UID, use default SmileOne API endpoint
      actualUid = apiUrl;
      actualApiUrl = 'https://www.smile.one/smilecoin/api';
    }

    actualApiUrl = normalizeSmileOneBaseUrl(actualApiUrl);

    console.log('Using credentials:', { uid: actualUid, apiUrl: actualApiUrl, email, hasKey: !!key });

    let result;

    switch (action) {
      case 'products':
        result = await getProducts(actualApiUrl, actualUid, email, key, productType);
        break;
        
      case 'validate':
        if (!userId || !zoneId) {
          return new Response(
            JSON.stringify({ error: 'userId and zoneId are required for validation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Always use 'mobilelegends' for validation - SmileOne validates MLBB accounts the same way
        // regardless of whether we're ordering diamonds, weekly pass, or Brazil diamonds
        const validationProductType = productType.startsWith('mobilelegends') ? productType : 'mobilelegends';
        result = await validatePlayer(actualApiUrl, actualUid, email, key, userId, zoneId, validationProductType);
        break;
        
      case 'order':
        if (!userId || !zoneId || !productId) {
          return new Response(
            JSON.stringify({ error: 'userId, zoneId, and productId are required to create an order' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await createOrder(actualApiUrl, actualUid, email, key, userId, zoneId, productId, productType);
        break;
        
      case 'balance':
        result = await getBalance(actualApiUrl, actualUid, email, key);
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
