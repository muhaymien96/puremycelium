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
      const { product_id, batch_number, quantity, production_date, expiry_date, notes, cost_per_unit } = body;

      if (!product_id || !batch_number || quantity === undefined || !production_date) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: product_id, batch_number, quantity, production_date' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Convert empty strings to null for optional fields
      const sanitizedExpiryDate = expiry_date && expiry_date.trim() !== '' ? expiry_date : null;
      const sanitizedNotes = notes && notes.trim() !== '' ? notes : null;

      // Verify product exists
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('id', product_id)
        .single();

      if (productError || !product) {
        console.error('Product not found:', productError);
        return new Response(
          JSON.stringify({ error: 'Product not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create batch
      const { data: batch, error: batchError } = await supabase
        .from('product_batches')
        .insert({
          product_id,
          batch_number,
          quantity,
          production_date,
          expiry_date: sanitizedExpiryDate,
          notes: sanitizedNotes,
          cost_per_unit: cost_per_unit !== undefined ? cost_per_unit : null
        })
        .select()
        .single();

      if (batchError) {
        console.error('Error creating batch:', batchError);
        return new Response(
          JSON.stringify({ error: batchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create stock movement (IN)
      const { error: stockError } = await supabase
        .from('stock_movements')
        .insert({
          product_id,
          batch_id: batch.id,
          movement_type: 'IN',
          quantity,
          reference_type: 'BATCH',
          reference_id: batch.id,
          notes: `Initial batch: ${batch_number}`,
          created_by: user.id
        });

      if (stockError) {
        console.error('Error creating stock movement:', stockError);
        // Note: Batch was created but stock movement failed
        return new Response(
          JSON.stringify({ 
            warning: 'Batch created but stock movement failed',
            batch,
            error: stockError.message 
          }),
          { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Created batch ${batch.id} with stock movement`);
      return new Response(
        JSON.stringify({ batch }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in product-batches function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
