import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: Products With Computed Stock
    if (req.method === "GET") {
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          product_batches (
            id,
            quantity
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      // Calculate total stock from batch quantities only
      const productsWithStock = products.map((p) => {
        const batchTotal = p.product_batches?.reduce(
          (sum: number, b: any) => sum + Number(b.quantity),
          0
        ) ?? 0;

        return {
          ...p,
          total_stock: batchTotal,
          batches: p.product_batches || [],
        };
      });

      return new Response(
        JSON.stringify({ products: productsWithStock }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Create Product
    if (req.method === "POST") {
      const body = await req.json();

      const required = ["name", "category", "unit_price"];
      for (const field of required) {
        if (!body[field]) {
          return new Response(JSON.stringify({ error: `${field} required` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { data, error } = await supabase
        .from("products")
        .insert({
          name: body.name,
          category: body.category,
          unit_price: body.unit_price,
          cost_price: body.cost_price || null,
          description: body.description,
          sku: body.sku,
          unit_of_measure: body.unit_of_measure || "unit",
          is_active: body.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ product: data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT: Update Product
    if (req.method === "PUT") {
      const body = await req.json();
      const { productId, ...updates } = body;
      if (!productId) {
        return new Response(JSON.stringify({ error: "Missing productId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allowed = ["name", "category", "unit_price", "cost_price", "description", "sku", "unit_of_measure"];
      const updateData: Record<string, any> = {};

      for (const key of allowed) {
        if (updates[key] !== undefined) updateData[key] = updates[key];
      }
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", productId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ product: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Error in products function:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
