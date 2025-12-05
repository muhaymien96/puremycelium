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

    console.log('Starting clear all data...');

    let deletedCounts = {
      stockMovements: 0,
      financialTransactions: 0,
      refunds: 0,
      orderStatusHistory: 0,
      invoices: 0,
      payments: 0,
      orderItems: 0,
      orders: 0,
      importBatches: 0,
    };

    // Delete in correct order due to foreign key constraints
    
    // 1. Stock movements
    const { data: sm, error: e1 } = await supabase
      .from('stock_movements')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');
    if (e1) console.error('Error deleting stock_movements:', e1);
    deletedCounts.stockMovements = sm?.length || 0;

    // 2. Financial transactions
    const { data: ft, error: e2 } = await supabase
      .from('financial_transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');
    if (e2) console.error('Error deleting financial_transactions:', e2);
    deletedCounts.financialTransactions = ft?.length || 0;

    // 3. Refunds
    const { data: rf, error: e3 } = await supabase
      .from('refunds')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');
    if (e3) console.error('Error deleting refunds:', e3);
    deletedCounts.refunds = rf?.length || 0;

    // 4. Order status history
    const { data: osh, error: e4 } = await supabase
      .from('order_status_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');
    if (e4) console.error('Error deleting order_status_history:', e4);
    deletedCounts.orderStatusHistory = osh?.length || 0;

    // 5. Invoices
    const { data: inv, error: e5 } = await supabase
      .from('invoices')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');
    if (e5) console.error('Error deleting invoices:', e5);
    deletedCounts.invoices = inv?.length || 0;

    // 6. Payments
    const { data: pay, error: e6 } = await supabase
      .from('payments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');
    if (e6) console.error('Error deleting payments:', e6);
    deletedCounts.payments = pay?.length || 0;

    // 7. Order items
    const { data: oi, error: e7 } = await supabase
      .from('order_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');
    if (e7) console.error('Error deleting order_items:', e7);
    deletedCounts.orderItems = oi?.length || 0;

    // 8. Orders
    const { data: ord, error: e8 } = await supabase
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');
    if (e8) console.error('Error deleting orders:', e8);
    deletedCounts.orders = ord?.length || 0;

    // 9. Import batches
    const { data: ib, error: e9 } = await supabase
      .from('import_batches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');
    if (e9) console.error('Error deleting import_batches:', e9);
    deletedCounts.importBatches = ib?.length || 0;

    console.log('Clear all data complete:', deletedCounts);

    return new Response(
      JSON.stringify({
        message: 'All transaction data cleared successfully',
        deleted: deletedCounts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Clear all data error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
