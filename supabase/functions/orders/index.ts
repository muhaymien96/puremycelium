import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { customer_id, market_event_id, items, discount_amount, tax_amount, notes } = body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid or empty items array' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate items structure
      for (const item of items) {
        if (!item.product_id || item.quantity === undefined || item.unit_price === undefined) {
          return new Response(
            JSON.stringify({ error: 'Each item must have product_id, quantity, and unit_price' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Calculate total
      const itemsTotal = items.reduce((sum, item) => {
        const subtotal = Number(item.quantity) * Number(item.unit_price);
        return sum + subtotal;
      }, 0);

      const totalAmount = itemsTotal + (Number(tax_amount) || 0) - (Number(discount_amount) || 0);

      // Generate order number (ORD-YYYYMMDD-XXXX)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const order_number = `ORD-${dateStr}-${randomSuffix}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number,
          customer_id,
          market_event_id,
          total_amount: totalAmount,
          discount_amount: discount_amount || 0,
          tax_amount: tax_amount || 0,
          status: 'pending',
          notes,
          created_by: user.id
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        return new Response(
          JSON.stringify({ error: orderError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // FIFO Batch Allocation - allocate batches to each order item
      const orderItems: any[] = [];
      const allocationWarnings: string[] = [];

      for (const item of items) {
        const requestedQty = Number(item.quantity);
        
        // Get available batches for this product, ordered by expiry date (FIFO - First Expiry First Out)
        const { data: batches, error: batchError } = await supabase
          .from('product_batches')
          .select('id, quantity, expiry_date, cost_per_unit')
          .eq('product_id', item.product_id)
          .gt('quantity', 0)
          .order('expiry_date', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true });

        if (batchError) {
          console.error('Error fetching batches for product:', item.product_id, batchError);
        }

        let remainingQty = requestedQty;
        const allocations: { batch_id: string; quantity: number; cost_per_unit: number | null }[] = [];

        // Allocate from available batches
        for (const batch of (batches || [])) {
          if (remainingQty <= 0) break;
          
          const batchQty = Number(batch.quantity);
          const allocateQty = Math.min(remainingQty, batchQty);
          
          allocations.push({
            batch_id: batch.id,
            quantity: allocateQty,
            cost_per_unit: batch.cost_per_unit
          });
          
          remainingQty -= allocateQty;
          console.log(`Allocated ${allocateQty} units from batch ${batch.id} for product ${item.product_id}`);
        }

        // Handle case where we couldn't allocate all requested quantity
        if (remainingQty > 0) {
          const warningMsg = `Insufficient stock for product ${item.product_id}: requested ${requestedQty}, allocated ${requestedQty - remainingQty}`;
          console.warn(warningMsg);
          allocationWarnings.push(warningMsg);
          
          // Still create order item without batch (will be tracked but stock won't decrement)
          if (allocations.length === 0) {
            allocations.push({
              batch_id: null as any,
              quantity: requestedQty,
              cost_per_unit: null
            });
          }
        }

        // Create order items for each allocation
        for (const alloc of allocations) {
          orderItems.push({
            order_id: order.id,
            product_id: item.product_id,
            batch_id: alloc.batch_id,
            quantity: alloc.quantity,
            unit_price: item.unit_price,
            subtotal: Number(alloc.quantity) * Number(item.unit_price)
          });
        }
      }

      // Insert all order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        return new Response(
          JSON.stringify({ 
            warning: 'Order created but items insertion failed',
            order,
            error: itemsError.message 
          }),
          { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ Created order ${order.id} with ${orderItems.length} items (from ${items.length} line items)`);
      
      const response: any = { order };
      if (allocationWarnings.length > 0) {
        response.warnings = allocationWarnings;
      }

      return new Response(
        JSON.stringify(response),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in orders function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
