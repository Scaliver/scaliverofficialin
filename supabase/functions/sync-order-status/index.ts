import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SMM_API_KEY = Deno.env.get('SMM_API_KEY');
const SMM_API_URL = Deno.env.get('SMM_API_URL');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function getSmmApiUrl(): string {
  if (!SMM_API_URL) throw new Error('SMM_API_URL not configured');

  const trimmed = SMM_API_URL.trim();

  if (/^[a-f0-9]{32,}$/i.test(trimmed) && !trimmed.includes('.') && !trimmed.includes('/')) {
    throw new Error('SMM_API_URL looks like an API key, not a URL.');
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withScheme).toString();
  } catch {
    throw new Error(`SMM_API_URL is invalid.`);
  }
}

// Map SMM API status to our status
function mapSmmStatus(smmStatus: string): string {
  const statusLower = smmStatus.toLowerCase();
  
  if (statusLower === 'completed' || statusLower === 'complete') {
    return 'completed';
  } else if (statusLower === 'partial') {
    return 'completed'; // Partial is treated as completed
  } else if (statusLower === 'canceled' || statusLower === 'cancelled' || statusLower === 'refunded') {
    return 'cancelled';
  } else if (statusLower === 'processing' || statusLower === 'in progress' || statusLower === 'inprogress') {
    return 'processing';
  } else if (statusLower === 'pending') {
    return 'pending';
  } else if (statusLower === 'error' || statusLower === 'fail' || statusLower === 'failed') {
    return 'failed';
  }
  
  return 'processing'; // Default to processing for unknown statuses
}

// Get order status from SMM Panel
async function getOrderStatus(orderId: string): Promise<any> {
  const formData = new URLSearchParams();
  formData.append('key', SMM_API_KEY!);
  formData.append('action', 'status');
  formData.append('order', orderId);

  console.log(`Fetching status for SMM order: ${orderId}`);

  const response = await fetch(getSmmApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const result = await response.json();
  console.log(`SMM API status response for order ${orderId}:`, result);
  return result;
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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase not configured');
      return new Response(
        JSON.stringify({ error: 'Supabase not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body for optional filters
    let specificOrderId: string | null = null;
    try {
      const body = await req.json();
      specificOrderId = body.orderId || null;
    } catch {
      // No body or invalid JSON, sync all pending orders
    }

    // Build query for orders to sync
    let query = supabase
      .from('orders')
      .select('id, smm_order_id, status, zone_id')
      .not('smm_order_id', 'is', null)
      .in('status', ['pending', 'processing']);

    // If specific order ID provided, only sync that one
    if (specificOrderId) {
      query = query.eq('id', specificOrderId);
    }

    const { data: orders, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching orders:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch orders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also check for legacy orders where SMM ID is in zone_id
    const { data: legacyOrders, error: legacyError } = await supabase
      .from('orders')
      .select('id, smm_order_id, status, zone_id')
      .is('smm_order_id', null)
      .like('zone_id', 'SMM#%')
      .in('status', ['pending', 'processing']);

    if (legacyError) {
      console.error('Error fetching legacy orders:', legacyError);
    }

    // Combine orders, migrating legacy ones
    const allOrders = [...(orders || [])];
    
    if (legacyOrders) {
      for (const legacyOrder of legacyOrders) {
        // Extract SMM ID from zone_id
        const smmId = legacyOrder.zone_id?.replace('SMM#', '');
        if (smmId) {
          // Migrate the SMM ID to the new column
          await supabase
            .from('orders')
            .update({ smm_order_id: smmId, zone_id: null })
            .eq('id', legacyOrder.id);
          
          allOrders.push({ ...legacyOrder, smm_order_id: smmId });
        }
      }
    }

    console.log(`Found ${allOrders.length} orders to sync`);

    const results: { orderId: string; smmOrderId: string; oldStatus: string; newStatus: string; synced: boolean }[] = [];

    // Sync each order
    for (const order of allOrders) {
      if (!order.smm_order_id) continue;

      try {
        const smmResponse = await getOrderStatus(order.smm_order_id);

        if (smmResponse.error) {
          console.error(`SMM API error for order ${order.id}:`, smmResponse.error);
          results.push({
            orderId: order.id,
            smmOrderId: order.smm_order_id,
            oldStatus: order.status,
            newStatus: order.status,
            synced: false,
          });
          continue;
        }

        const newStatus = mapSmmStatus(smmResponse.status);

        // Update if status changed
        if (newStatus !== order.status) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', order.id);

          if (updateError) {
            console.error(`Error updating order ${order.id}:`, updateError);
            results.push({
              orderId: order.id,
              smmOrderId: order.smm_order_id,
              oldStatus: order.status,
              newStatus: order.status,
              synced: false,
            });
          } else {
            console.log(`Updated order ${order.id}: ${order.status} -> ${newStatus}`);
            results.push({
              orderId: order.id,
              smmOrderId: order.smm_order_id,
              oldStatus: order.status,
              newStatus: newStatus,
              synced: true,
            });
          }
        } else {
          results.push({
            orderId: order.id,
            smmOrderId: order.smm_order_id,
            oldStatus: order.status,
            newStatus: order.status,
            synced: true,
          });
        }
      } catch (orderError) {
        console.error(`Error syncing order ${order.id}:`, orderError);
        results.push({
          orderId: order.id,
          smmOrderId: order.smm_order_id || '',
          oldStatus: order.status,
          newStatus: order.status,
          synced: false,
        });
      }
    }

    const syncedCount = results.filter(r => r.synced).length;
    const updatedCount = results.filter(r => r.synced && r.oldStatus !== r.newStatus).length;

    console.log(`Sync complete: ${syncedCount}/${results.length} synced, ${updatedCount} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        totalOrders: results.length,
        syncedCount,
        updatedCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in sync-order-status function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
