import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YOCO_API_URL = 'https://payments.yoco.com/api/checkouts';

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
    const { order_id, payment_method, amount, manual_terminal_confirmation, metadata } = body;

    if (!order_id || !payment_method || amount === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: order_id, payment_method, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify order exists and get details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(product_id, batch_id, quantity)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CASH Payment Flow or Manual Terminal Confirmation
    if (payment_method === 'CASH' || (payment_method === 'YOKO_WEBPOS' && manual_terminal_confirmation)) {
      // Update order status to confirmed
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', order_id);

      if (updateError) {
        console.error('Error updating order:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update order status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id,
          amount,
          payment_method: payment_method,
          payment_status: 'completed',
          created_by: user.id,
          notes: manual_terminal_confirmation ? 'Manual terminal confirmation' : (metadata?.notes || null)
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating payment:', paymentError);
        return new Response(
          JSON.stringify({ error: 'Failed to create payment record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Decrement stock for all order items
      for (const item of order.order_items) {
        // Update batch quantity if batch_id specified
        if (item.batch_id) {
          const { error: batchError } = await supabase.rpc('decrement_batch_quantity', {
            p_batch_id: item.batch_id,
            p_quantity: item.quantity
          });

          if (batchError) {
            console.error('Error decrementing batch:', batchError);
          }
        }

        // Create stock movement (OUT)
        await supabase.from('stock_movements').insert({
          product_id: item.product_id,
          batch_id: item.batch_id,
          movement_type: 'OUT',
          quantity: -Math.abs(item.quantity), // Negative for OUT movements
          reference_type: 'ORDER',
          reference_id: order_id,
          notes: `Cash payment for order ${order.order_number}`,
          created_by: user.id
        });
      }

      // Generate invoice (paid for cash/terminal)
      const { data: invoiceNumberData } = await supabase.rpc('generate_invoice_number');
      const invoice_number = invoiceNumberData || `INV-${Date.now()}`;

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number,
          order_id,
          customer_id: order.customer_id,
          total_amount: order.total_amount,
          tax_amount: order.tax_amount,
          paid_amount: amount,
          status: 'paid', // Cash/terminal payments are immediately paid
          created_by: user.id
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
      } else {
        // Trigger PDF generation
        try {
          const pdfResponse = await supabase.functions.invoke('generate-invoice-pdf', {
            body: { invoice_id: invoice.id }
          });
          console.log('PDF generation triggered:', pdfResponse);

          // Trigger invoice delivery
          const sendResponse = await supabase.functions.invoke('send-invoice', {
            body: { invoice_id: invoice.id }
          });
          console.log('Invoice delivery triggered:', sendResponse);
        } catch (invoiceProcessError) {
          console.error('Error processing invoice PDF/delivery:', invoiceProcessError);
        }
      }

      console.log(`CASH payment processed for order ${order_id}`);
      return new Response(
        JSON.stringify({ 
          success: true,
          payment,
          invoice,
          message: 'Cash payment processed successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // YOCO Payment Flow (YOKO_WEBPOS or PAYMENT_LINK)
    if (payment_method === 'YOKO_WEBPOS' || payment_method === 'PAYMENT_LINK') {
      if (!yocoSecretKey) {
        return new Response(
          JSON.stringify({ error: 'Yoco API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create Yoco checkout
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://yxjygrsmxrsmdzubzpsj.lovable.app';
      const checkoutPayload = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'ZAR',
        successUrl: metadata?.successUrl || `${frontendUrl}/payment/success`,
        cancelUrl: metadata?.cancelUrl || `${frontendUrl}/payment/cancel`,
        failureUrl: metadata?.failureUrl || `${frontendUrl}/payment/failure`,
        metadata: {
          order_id,
          order_number: order.order_number,
          user_id: user.id,
          ...metadata
        }
      };

      console.log('Creating Yoco checkout:', checkoutPayload);

      const yocoResponse = await fetch(YOCO_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${yocoSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutPayload)
      });

      if (!yocoResponse.ok) {
        const errorText = await yocoResponse.text();
        console.error('Yoco API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to create Yoco checkout', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const yocoData = await yocoResponse.json();

      // Create pending payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id,
          amount,
          payment_method,
          payment_status: 'pending',
          checkout_id: yocoData.id, // Store checkout ID
          created_by: user.id
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
      }

      console.log(`Yoco checkout created for order ${order_id}: ${yocoData.redirectUrl}`);
      return new Response(
        JSON.stringify({ 
          success: true,
          checkout_url: yocoData.redirectUrl,
          checkout_id: yocoData.id,
          payment,
          message: 'Redirect user to checkout_url to complete payment'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid payment method. Use CASH, YOKO_WEBPOS, or PAYMENT_LINK' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in order-pay function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
