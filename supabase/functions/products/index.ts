import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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

    if (req.method === 'GET') {
      // List products with current stock levels (ACTIVE ONLY)
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          product_batches (
            id,
            batch_number,
            quantity,
            production_date,
            expiry_date
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        return new Response(
          JSON.stringify({ error: productsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate total stock for each product
      const productsWithStock = products.map(product => {
        const totalStock = product.product_batches?.reduce(
          (sum: number, batch: any) => sum + Number(batch.quantity),
          0
        ) || 0;
        return {
          ...product,
          total_stock: totalStock,
          batches: product.product_batches || []
        };
      });

      console.log(`Fetched ${productsWithStock.length} products`);
      return new Response(
        JSON.stringify({ products: productsWithStock }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      // Create new product
      const body = await req.json();
      const { name, category, unit_price, description, sku, unit_of_measure, is_active } = body;

      if (!name || !category || unit_price === undefined) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: name, category, unit_price' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: product, error: insertError } = await supabase
        .from('products')
        .insert({
          name,
          category,
          unit_price,
          description,
          sku,
          unit_of_measure: unit_of_measure || 'kg',
          is_active: is_active !== undefined ? is_active : true
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating product:', insertError);
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Created product: ${product.id}`);
      return new Response(
        JSON.stringify({ product }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'PUT') {
      // Update product
      const body = await req.json();
      const { productId, ...updates } = body;
      if (!productId) {
        return new Response(
          JSON.stringify({ error: 'Missing productId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Only allow certain fields to be updated
      const allowedFields = ['name', 'category', 'unit_price', 'description', 'sku', 'unit_of_measure'];
      const updateData: Record<string, any> = {};
      for (const key of allowedFields) {
        if (updates[key] !== undefined) updateData[key] = updates[key];
      }
      updateData.updated_at = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId)
        .select()
        .single();
      if (updateError) {
        console.error('Error updating product:', updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ product: updated }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in products function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
