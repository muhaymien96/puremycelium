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

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // GET single invoice by ID
    if (req.method === 'GET' && pathSegments.length >= 2) {
      const invoiceId = pathSegments[pathSegments.length - 1];

      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers(first_name, last_name, email, phone, address, city, preferred_channel),
          orders(
            order_number,
            created_at,
            order_items(
              quantity,
              unit_price,
              subtotal,
              products(name, sku, category)
            )
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(invoice),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET list of invoices with filters
    if (req.method === 'GET') {
      const status = url.searchParams.get('status');
      const customerId = url.searchParams.get('customer_id');
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');
      const deliveryStatus = url.searchParams.get('delivery_status');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('invoices')
        .select(`
          *,
          customers(first_name, last_name, email),
          orders(order_number)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      if (deliveryStatus) {
        query = query.eq('delivery_status', deliveryStatus);
      }

      if (startDate) {
        query = query.gte('invoice_date', startDate);
      }

      if (endDate) {
        query = query.lte('invoice_date', endDate);
      }

      const { data: invoices, error, count } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          data: invoices, 
          count,
          limit,
          offset
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in invoices function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});