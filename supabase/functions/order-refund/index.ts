import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    // Require auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { order_id, payment_id, amount, reason, notes, items } = body;

    if (!order_id || !amount || !items || items.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("Refund requested:", body);

    // Get order + payments for status logic
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, payments(*)")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Create refund entry
    const { data: refund, error: refundInsertError } = await supabase
      .from("refunds")
      .insert({
        order_id,
        payment_id: payment_id || null,
        amount,
        reason,
        status: "pending",
        notes,
        created_by: user.id,
      })
      .select()
      .single();

    if (refundInsertError) throw refundInsertError;

    // Process stock — atomic
    for (const item of items) {
      if (item.batch_id) {
        const { error: rpcError } = await supabase.rpc(
          "increment_batch_quantity",
          {
            p_batch_id: item.batch_id,
            p_quantity: item.quantity,
          }
        );
        if (rpcError) console.error("Batch increment failed", rpcError);
      }

      await supabase.from("stock_movements").insert({
        product_id: item.product_id,
        batch_id: item.batch_id,
        quantity: item.quantity,
        movement_type: "IN",
        reference_type: "REFUND",
        reference_id: refund.id,
        notes: `Refund for ${order.order_number}`,
        created_by: user.id,
      });
    }

    // Record finance reversal
    try {
      const { data: saleTx } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("order_id", order_id)
        .eq("transaction_type", "sale")
        .single();

      if (saleTx) {
        const fraction = amount / saleTx.amount;

        await supabase.from("financial_transactions").insert({
          order_id,
          transaction_type: "refund",
          amount: -amount,
          cost: -(saleTx.cost * fraction),
          profit: -(saleTx.profit * fraction),
          notes: reason || "Refund",
          payment_method: saleTx.payment_method,
          transaction_at: new Date().toISOString(),
        });
      }
    } catch (fErr) {
      console.error("Financial reverse error", fErr);
    }

    // Mark refund completed immediately for CASH
    const cashPayment = order.payments?.find(
      (p: any) => p.payment_method === "CASH" && p.payment_status === "completed"
    );

    if (cashPayment) {
      await supabase.from("refunds")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", refund.id);

      await supabase.from("payments")
        .update({ payment_status: "refunded" })
        .eq("id", payment_id);
    }

    // Update order status
    const refundTotal =
      (order.refunds?.filter((r: any) => r.status === "completed") || []).reduce(
        (s: number, r: any) => s + Number(r.amount),
        0
      ) + Number(amount);

    let newStatus = order.status;
    if (refundTotal >= Number(order.total_amount)) newStatus = "refunded";
    else if (refundTotal > 0) newStatus = "partially_refunded";

    await supabase.from("orders")
      .update({ status: newStatus })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({
        success: true,
        refund,
        message: "Refund processed successfully",
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: `${err}` }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
