import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YOCO_API_BASE_URL = 'https://payments.yoco.com/api/checkouts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const yocoSecretKey = Deno.env.get('YOCO_SECRET_KEY');
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

    const body = await req.json();
    const { order_id, payment_id, amount, reason, notes, items } = body;

    if (!order_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: order_id, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment if payment_id provided
    let payment = null;
    if (payment_id) {
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', payment_id)
        .single();

      if (paymentError || !paymentData) {
        console.error('Payment not found:', paymentError);
        return new Response(
          JSON.stringify({ error: 'Payment not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      payment = paymentData;
    }

    // Check if checkout_id exists for Yoco refunds
    if (payment && !payment.checkout_id && payment.payment_method !== 'CASH') {
      console.warn('No checkout_id found for non-CASH payment - cannot process Yoco refund');
    }

    // Create refund record
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .insert({
        order_id,
        payment_id: payment_id || null,
        amount,
        reason: reason || 'Customer request',
        status: 'pending',
        notes,
        created_by: user.id
      })
      .select()
      .single();

    if (refundError) {
      console.error('Error creating refund:', refundError);
      return new Response(
        JSON.stringify({ error: refundError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If payment was via Yoco, process refund via Yoco API
    if (payment && payment.checkout_id && yocoSecretKey) {
      const YOCO_REFUND_URL = `${YOCO_API_BASE_URL}/${payment.checkout_id}/refund`;
      
      const refundPayload = {
        amount: Math.round(amount * 100) // Convert to cents - Yoco expects this format
      };

      console.log('Processing Yoco refund:', { url: YOCO_REFUND_URL, payload: refundPayload });

      const yocoResponse = await fetch(YOCO_REFUND_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${yocoSecretKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': refund.id // Use refund ID for idempotency
        },
        body: JSON.stringify(refundPayload)
      });

      // Yoco returns 202 Accepted for async refund processing
      if (!yocoResponse.ok && yocoResponse.status !== 202) {
        const errorText = await yocoResponse.text();
        console.error('Yoco refund API error:', errorText);
        
        // Update refund status to rejected
        await supabase
          .from('refunds')
          .update({ 
            status: 'rejected',
            notes: `Yoco API error: ${errorText}`
          })
          .eq('id', refund.id);

        return new Response(
          JSON.stringify({ 
            error: 'Yoco refund failed',
            details: errorText,
            refund 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Yoco refund initiated - awaiting webhook confirmation');

      // Refund will be completed via webhook (202 Accepted response)
      return new Response(
        JSON.stringify({ 
          success: true,
          refund,
          message: 'Refund initiated via Yoco. Processing will complete shortly via webhook.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process stock adjustment if items are provided
    if (items && items.length > 0) {
      console.log('Processing stock adjustment for refunded items:', items);
      
      for (const item of items) {
        // Return stock to batch
        if (item.batch_id) {
          const { data: batch } = await supabase
            .from('product_batches')
            .select('quantity')
            .eq('id', item.batch_id)
            .single();

          if (batch) {
            const { error: batchError } = await supabase
              .from('product_batches')
              .update({
                quantity: Number(batch.quantity) + Number(item.quantity)
              })
              .eq('id', item.batch_id);

            if (batchError) {
              console.error('Error updating batch quantity:', batchError);
            }
          }
        }

        // Create stock movement record
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            product_id: item.product_id,
            batch_id: item.batch_id,
            quantity: item.quantity,
            movement_type: 'IN',
            reference_type: 'REFUND',
            reference_id: refund.id,
            notes: `Refund for order ${order.order_number}`,
            created_by: user.id
          });

        if (movementError) {
          console.error('Error creating stock movement:', movementError);
        }
      }
    }

    // For CASH payments, immediately mark as completed
    if (payment && payment.payment_method === 'CASH') {
      await supabase
        .from('refunds')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', refund.id);

      // Update payment status
      await supabase
        .from('payments')
        .update({ payment_status: 'refunded' })
        .eq('id', payment.id);

      console.log(`CASH refund completed for order ${order_id}`);
    }

    // Update order status based on refund amount
    const totalRefundedAmount = Number(amount) + (order.refunds?.reduce(
      (sum: number, r: any) => sum + (r.status === 'completed' ? Number(r.amount) : 0),
      0
    ) || 0);

    let newOrderStatus = order.status;
    if (totalRefundedAmount >= Number(order.total_amount)) {
      newOrderStatus = 'refunded';
    } else if (totalRefundedAmount > 0) {
      newOrderStatus = 'partially_refunded';
    }

    if (newOrderStatus !== order.status) {
      await supabase
        .from('orders')
        .update({ status: newOrderStatus })
        .eq('id', order_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        refund,
        message: payment?.payment_method === 'CASH' 
          ? 'Cash refund completed'
          : 'Refund record created'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in order-refund function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
