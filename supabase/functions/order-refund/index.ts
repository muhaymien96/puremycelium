import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YOCO_API_URL = 'https://payments.yoco.com/api/refunds';

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
    const { order_id, payment_id, amount, reason, notes } = body;

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
    if (payment && payment.provider_payment_id && yocoSecretKey) {
      const refundPayload = {
        paymentId: payment.provider_payment_id,
        amount: Math.round(amount * 100), // Convert to cents
        metadata: {
          refund_id: refund.id,
          order_id,
          reason: reason || 'Customer request'
        }
      };

      console.log('Processing Yoco refund:', refundPayload);

      const yocoResponse = await fetch(YOCO_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${yocoSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refundPayload)
      });

      if (!yocoResponse.ok) {
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

      const yocoData = await yocoResponse.json();
      console.log('Yoco refund initiated:', yocoData);

      // Refund will be completed via webhook
      return new Response(
        JSON.stringify({ 
          success: true,
          refund,
          yoco_refund: yocoData,
          message: 'Refund initiated via Yoco. Awaiting webhook confirmation.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
