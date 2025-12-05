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

    // Verify user is authenticated and admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabase.rpc('get_user_roles', { _user_id: user.id });
    if (!roles?.includes('admin')) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting COGS backfill...');

    // Get all financial transactions with cost = 0 and transaction_type = 'sale'
    const { data: transactions, error: txError } = await supabase
      .from('financial_transactions')
      .select('id, order_id, amount, cost, profit')
      .eq('transaction_type', 'sale')
      .eq('cost', 0);

    if (txError) {
      console.error('Error fetching transactions:', txError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transactions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No transactions need backfilling',
          updated: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${transactions.length} transactions to backfill`);

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const tx of transactions) {
      try {
        // Get order items with batch and product info
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('quantity, unit_price, batch_id, product_id, products(cost_price, unit_price), product_batches(cost_per_unit)')
          .eq('order_id', tx.order_id);

        if (itemsError || !orderItems || orderItems.length === 0) {
          console.warn(`No items found for order ${tx.order_id}`);
          skipped++;
          continue;
        }

        let totalCost = 0;
        for (const item of orderItems) {
          const quantity = Number(item.quantity);
          
          // Fallback chain: batch cost -> product cost -> estimated (60% of price)
          // Note: product_batches and products come as arrays from the join
          const batch = Array.isArray(item.product_batches) ? item.product_batches[0] : item.product_batches;
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          
          const batchCost = batch?.cost_per_unit;
          const productCost = product?.cost_price;
          const productPrice = product?.unit_price || item.unit_price;
          const estimatedCost = Number(productPrice) * 0.6;
          
          const costPerUnit = Number(batchCost || productCost || estimatedCost || 0);
          totalCost += quantity * costPerUnit;
        }

        if (totalCost > 0) {
          const profit = Number(tx.amount) - totalCost;
          
          const { error: updateError } = await supabase
            .from('financial_transactions')
            .update({
              cost: totalCost,
              profit: profit,
              notes: `Sale completed (COGS backfilled on ${new Date().toISOString().split('T')[0]})`
            })
            .eq('id', tx.id);

          if (updateError) {
            console.error(`Error updating transaction ${tx.id}:`, updateError);
            errors.push(`TX ${tx.id}: ${updateError.message}`);
          } else {
            updated++;
            console.log(`✅ Updated TX ${tx.id}: cost=${totalCost.toFixed(2)}, profit=${profit.toFixed(2)}`);
          }
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`Error processing transaction ${tx.id}:`, err);
        errors.push(`TX ${tx.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    const summary = {
      success: true,
      message: `COGS backfill completed`,
      total: transactions.length,
      updated,
      skipped,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    };

    console.log('Backfill summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
