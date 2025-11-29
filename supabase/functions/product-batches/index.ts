import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { product_id, batch_number, quantity, production_date, expiry_date, notes, cost_per_unit } = body;

      console.log("📦 Creating batch with data:", body);

      if (!product_id || !batch_number || quantity === undefined || !production_date) {
        return new Response(JSON.stringify({
          error: "Missing required fields",
          required: ["product_id", "batch_number", "quantity", "production_date"],
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Convert values
      const parsedQty = Number(quantity);
      const parsedCost = cost_per_unit !== "" && cost_per_unit !== undefined ? Number(cost_per_unit) : null;

      // Validate numeric
      if (isNaN(parsedQty) || parsedQty <= 0) {
        return new Response(JSON.stringify({ error: "Quantity must be a positive number" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Confirm product exists
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id")
        .eq("id", product_id)
        .single();

      if (productError || !product) {
        console.error("Product lookup failed", productError);
        return new Response(JSON.stringify({
          error: "Product not found",
          product_id
        }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Create the batch
      const { data: batch, error: batchError } = await supabase
        .from("product_batches")
        .insert({
          product_id,
          batch_number,
          quantity: parsedQty,
          cost_per_unit: parsedCost,
          production_date,
          expiry_date: expiry_date || null,
          notes: notes || null,
          created_by: user.id
        })
        .select()
        .single();

      if (batchError) {
        console.error("❌ Batch Insert Error:", batchError);
        return new Response(JSON.stringify({
          message: batchError.message,
          code: batchError.code,
          details: batchError.details,
          hint: batchError.hint
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`📥 Batch created successfully: ${batch.id}`);

      // Create stock movement audit
      const { error: stockError } = await supabase
        .from("stock_movements")
        .insert({
          product_id,
          batch_id: batch.id,
          movement_type: "IN",
          quantity: parsedQty,
          reference_type: "BATCH",
          reference_id: batch.id,
          notes: `Initial batch ${batch_number}`,
          created_by: user.id,
        });

      if (stockError) {
        console.error("⚠ Stock Movement Error", stockError);
        return new Response(JSON.stringify({
          warning: "Batch created but stock movement failed",
          stockError
        }), {
          status: 207,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, batch }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("🔥 Unexpected Error:", error);
    return new Response(JSON.stringify({
      error: error?.message || "Unknown error",
      stack: error?.stack || null
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
