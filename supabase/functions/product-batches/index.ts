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

    // Handle PUT request for updating batch
    if (req.method === "PUT") {
      const body = await req.json();
      const { batch_id, quantity, cost_per_unit, expiry_date, notes, original_quantity } = body;

      console.log("📦 Updating batch:", body);

      if (!batch_id || quantity === undefined) {
        return new Response(JSON.stringify({
          error: "Missing required fields",
          required: ["batch_id", "quantity"],
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const parsedQty = Number(quantity);
      const parsedOriginalQty = Number(original_quantity);
      const parsedCost = cost_per_unit !== null && cost_per_unit !== "" ? Number(cost_per_unit) : null;

      if (isNaN(parsedQty) || parsedQty < 0) {
        return new Response(JSON.stringify({ error: "Quantity must be a non-negative number" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the batch to find product_id
      const { data: existingBatch, error: batchLookupError } = await supabase
        .from("product_batches")
        .select("id, product_id, batch_number")
        .eq("id", batch_id)
        .single();

      if (batchLookupError || !existingBatch) {
        return new Response(JSON.stringify({ error: "Batch not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update the batch
      const { data: updatedBatch, error: updateError } = await supabase
        .from("product_batches")
        .update({
          quantity: parsedQty,
          cost_per_unit: parsedCost,
          expiry_date: expiry_date || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", batch_id)
        .select()
        .single();

      if (updateError) {
        console.error("❌ Batch Update Error:", updateError);
        return new Response(JSON.stringify({
          error: updateError.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create stock movement if quantity changed
      const quantityDiff = parsedQty - parsedOriginalQty;
      if (quantityDiff !== 0) {
        const movementType = quantityDiff > 0 ? "IN" : "OUT";
        const movementQty = Math.abs(quantityDiff);

        const { error: movementError } = await supabase
          .from("stock_movements")
          .insert({
            product_id: existingBatch.product_id,
            batch_id: batch_id,
            movement_type: movementType,
            quantity: movementQty,
            reference_type: "ADJUSTMENT",
            reference_id: batch_id,
            notes: `Manual adjustment: ${quantityDiff > 0 ? '+' : ''}${quantityDiff} units on batch ${existingBatch.batch_number}`,
            created_by: user.id,
          });

        if (movementError) {
          console.error("⚠ Stock Movement Error:", movementError);
        } else {
          console.log(`📊 Stock movement recorded: ${movementType} ${movementQty}`);
        }
      }

      console.log(`✅ Batch updated: ${batch_id}`);

      return new Response(JSON.stringify({ success: true, batch: updatedBatch }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle POST request for creating batch
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : null;
    return new Response(JSON.stringify({
      error: errorMessage,
      stack: errorStack
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
