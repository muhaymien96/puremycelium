import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface IncomingItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

interface OrderItemInsert {
  order_id: string;
  product_id: string;
  batch_id: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

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

    // --- Auth ---
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const {
      customer_id,
      market_event_id,
      items,
      discount_amount,
      tax_amount,
      notes,
    } = body as {
      customer_id?: string | null;
      market_event_id?: string | null;
      items: IncomingItem[];
      discount_amount?: number;
      tax_amount?: number;
      notes?: string;
    };

    // --- Basic validation ---
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid or empty items array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    for (const item of items) {
      if (!item.product_id || item.quantity == null || item.unit_price == null) {
        return new Response(
          JSON.stringify({
            error:
              "Each item must have product_id, quantity, and unit_price",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // --- Totals ---
    const itemsTotal = items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      return sum + qty * price;
    }, 0);

    const totalAmount =
      itemsTotal + (Number(tax_amount) || 0) - (Number(discount_amount) || 0);

    // --- Order number ---
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const order_number = `ORD-${dateStr}-${randomSuffix}`;

    // --- Create order row ---
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number,
        customer_id: customer_id ?? null,
        market_event_id: market_event_id ?? null,
        total_amount: totalAmount,
        discount_amount: discount_amount || 0,
        tax_amount: tax_amount || 0,
        status: "pending",
        notes,
        created_by: user.id,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Error creating order:", orderError);
      return new Response(
        JSON.stringify({ error: orderError?.message ?? "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- FIFO batch allocation for each item ---
    const orderItems: OrderItemInsert[] = [];
    const allocationWarnings: string[] = [];

    for (const item of items) {
      const requestedQty = Number(item.quantity) || 0;
      if (requestedQty <= 0) continue;

      // Fetch available batches for the product (FIFO by expiry then created_at)
      const { data: batches, error: batchError } = await supabase
        .from("product_batches")
        .select("id, quantity, expiry_date, cost_per_unit")
        .eq("product_id", item.product_id)
        .gt("quantity", 0)
        .order("expiry_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      if (batchError) {
        console.error(
          "Error fetching batches for product:",
          item.product_id,
          batchError,
        );
      }

      let remainingQty = requestedQty;
      const allocations: { batch_id: string | null; quantity: number }[] = [];

      if (batches && batches.length > 0) {
        for (const batch of batches) {
          if (remainingQty <= 0) break;

          const batchQty = Number(batch.quantity) || 0;
          if (batchQty <= 0) continue;

          const allocateQty = Math.min(remainingQty, batchQty);
          allocations.push({
            batch_id: batch.id,
            quantity: allocateQty,
          });
          remainingQty -= allocateQty;

          console.log(
            `Allocated ${allocateQty} units from batch ${batch.id} for product ${item.product_id}`,
          );
        }
      }

      if (remainingQty > 0) {
        // Not enough stock for this product
        const allocated = requestedQty - remainingQty;
        const msg =
          `Insufficient stock for product ${item.product_id}: requested ${requestedQty}, allocated ${allocated}`;
        console.warn(msg);
        allocationWarnings.push(msg);

        if (allocations.length === 0) {
          // No batch available at all - still create a non-batch order item
          allocations.push({
            batch_id: null,
            quantity: requestedQty,
          });
        }
      }

      // Build order_items (possibly multiple rows per product)
      for (const alloc of allocations) {
        const qty = alloc.quantity;
        if (!qty || qty <= 0) continue;

        orderItems.push({
          order_id: order.id,
          product_id: item.product_id,
          batch_id: alloc.batch_id,
          quantity: qty,
          unit_price: Number(item.unit_price) || 0,
          subtotal: qty * (Number(item.unit_price) || 0),
        });
      }
    }

    // Insert all order items
    if (orderItems.length === 0) {
      console.warn(
        `Order ${order.id} has no stock allocations. Creating order with no items.`,
      );
    } else {
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Error creating order items:", itemsError);
        return new Response(
          JSON.stringify({
            warning: "Order created but items insertion failed",
            order,
            error: itemsError.message,
          }),
          {
            status: 207,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    console.log(
      `✅ Created order ${order.id} with ${orderItems.length} order_items from ${items.length} line items`,
    );

    const response: Record<string, unknown> = { order };
    if (allocationWarnings.length > 0) {
      response.warnings = allocationWarnings;
    }

    return new Response(
      JSON.stringify(response),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error in orders function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
