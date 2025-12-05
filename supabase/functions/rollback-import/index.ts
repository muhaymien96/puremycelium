import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user is admin
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { import_batch_id } = await req.json();

    if (!import_batch_id) {
      return new Response(
        JSON.stringify({ error: 'Missing import_batch_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting rollback for import batch: ${import_batch_id}`);

    // Get the import batch
    const { data: importBatch, error: batchError } = await supabase
      .from('import_batches')
      .select('*')
      .eq('id', import_batch_id)
      .single();

    if (batchError || !importBatch) {
      throw new Error('Import batch not found');
    }

    if (importBatch.status === 'rolled_back') {
      return new Response(
        JSON.stringify({ error: 'This import has already been rolled back' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all orders from this import batch
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('import_batch_id', import_batch_id);

    if (ordersError) throw ordersError;

    if (!orders || orders.length === 0) {
      console.log('No orders found for this import batch');
      await supabase
        .from('import_batches')
        .update({ status: 'rolled_back' })
        .eq('id', import_batch_id);

      return new Response(
        JSON.stringify({ 
          message: 'No orders to rollback',
          ordersDeleted: 0,
          stockRestored: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderIds = orders.map(o => o.id);
    console.log(`Found ${orderIds.length} orders to rollback`);

    // Get all stock movements for these orders
    const { data: stockMovements, error: movementsError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('movement_type', 'sale')
      .in('reference_id', orderIds);

    if (movementsError) throw movementsError;

    let stockRestored = 0;
    
    // Reverse stock movements by incrementing batches
    if (stockMovements && stockMovements.length > 0) {
      console.log(`Reversing ${stockMovements.length} stock movements`);
      
      for (const movement of stockMovements) {
        if (movement.batch_id) {
          // Increment batch quantity to restore stock
          const { error: batchError } = await supabase.rpc('increment_batch_quantity', {
            p_batch_id: movement.batch_id,
            p_quantity: Math.abs(movement.quantity)
          });

          if (batchError) {
            console.error(`Failed to restore batch ${movement.batch_id}:`, batchError);
          } else {
            stockRestored += Math.abs(movement.quantity);
          }
        }

        // Create reversal stock movement record
        await supabase
          .from('stock_movements')
          .insert({
            product_id: movement.product_id,
            batch_id: movement.batch_id,
            movement_type: 'adjustment',
            quantity: Math.abs(movement.quantity),
            reference_type: 'rollback',
            reference_id: import_batch_id,
            notes: `Rollback of import batch ${import_batch_id}`,
            created_by: user.id,
          });
      }
    }

    // Delete invoices for these orders
    const { error: invoicesError } = await supabase
      .from('invoices')
      .delete()
      .in('order_id', orderIds);

    if (invoicesError) {
      console.error('Error deleting invoices:', invoicesError);
    }

    // Delete financial transactions
    const { error: financialError } = await supabase
      .from('financial_transactions')
      .delete()
      .in('order_id', orderIds);

    if (financialError) {
      console.error('Error deleting financial transactions:', financialError);
    }

    // Delete payments
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .in('order_id', orderIds);

    if (paymentsError) {
      console.error('Error deleting payments:', paymentsError);
    }

    // Delete order items
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .in('order_id', orderIds);

    if (itemsError) {
      console.error('Error deleting order items:', itemsError);
    }

    // Delete stock movements
    const { error: stockDeleteError } = await supabase
      .from('stock_movements')
      .delete()
      .eq('movement_type', 'sale')
      .in('reference_id', orderIds);

    if (stockDeleteError) {
      console.error('Error deleting stock movements:', stockDeleteError);
    }

    // Delete orders
    const { error: ordersDeleteError } = await supabase
      .from('orders')
      .delete()
      .eq('import_batch_id', import_batch_id);

    if (ordersDeleteError) {
      console.error('Error deleting orders:', ordersDeleteError);
    }

    // Update import batch status
    const { error: updateError } = await supabase
      .from('import_batches')
      .update({ 
        status: 'rolled_back',
        completed_at: new Date().toISOString()
      })
      .eq('id', import_batch_id);

    if (updateError) {
      console.error('Error updating import batch:', updateError);
    }

    console.log(`Rollback complete: ${orderIds.length} orders deleted, ${stockRestored} units restored`);

    return new Response(
      JSON.stringify({
        message: 'Import successfully rolled back',
        ordersDeleted: orderIds.length,
        stockRestored: stockRestored,
        stockMovementsReversed: stockMovements?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Rollback function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
