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

    // Verify order exists and get details with product cost info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(product_id, batch_id, quantity, unit_price, products(cost_price, unit_price))')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CASH Payment Flow or Manual Terminal Confirmation (including marking PAYMENT_LINK as paid)
    if (payment_method === 'CASH' || ((payment_method === 'YOKO_WEBPOS' || payment_method === 'PAYMENT_LINK') && manual_terminal_confirmation)) {
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

      // For manual confirmation, check if there's an existing pending payment to update
      let payment;
      if (manual_terminal_confirmation) {
        // Try to find and update existing pending payment
        const { data: existingPayment, error: findError } = await supabase
          .from('payments')
          .select('*')
          .eq('order_id', order_id)
          .eq('payment_method', payment_method)
          .eq('payment_status', 'pending')
          .maybeSingle();

        if (existingPayment) {
          // Update existing pending payment to completed
          const { data: updatedPayment, error: updatePaymentError } = await supabase
            .from('payments')
            .update({
              payment_status: 'completed',
              notes: 'Manually marked as paid'
            })
            .eq('id', existingPayment.id)
            .select()
            .single();

          if (updatePaymentError) {
            console.error('Error updating payment:', updatePaymentError);
            return new Response(
              JSON.stringify({ error: 'Failed to update payment record' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          payment = updatedPayment;
          console.log(`✅ Updated existing pending payment ${existingPayment.id} to completed`);
        } else {
          // Create new payment record if no pending payment exists
          const { data: newPayment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              order_id,
              amount,
              payment_method: payment_method,
              payment_status: 'completed',
              created_by: user.id,
              notes: 'Manual terminal confirmation'
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
          payment = newPayment;
        }
      } else {
        // Create new payment record for regular CASH payments
        const { data: newPayment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            order_id,
            amount,
            payment_method: payment_method,
            payment_status: 'completed',
            created_by: user.id,
            notes: metadata?.notes || null
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
        payment = newPayment;
      }

      // Decrement stock for all order items
      let totalCost = 0;
      for (const item of order.order_items) {
        const qty = Number(item.quantity);

        if (item.batch_id && Number.isFinite(qty) && qty > 0) {
          // Use RPC function for atomic decrement
          const { error: batchError } = await supabase.rpc('decrement_batch_quantity', {
            p_batch_id: item.batch_id,
            p_quantity: qty
          });

          if (batchError) {
            console.error('Error decrementing batch:', batchError);
          } else {
            console.log(`✅ Decremented batch ${item.batch_id} by ${qty}`);
          }

          // Calculate cost with fallback chain: product cost -> estimated (60% of price)
          const productCost = item.products?.cost_price;
          const estimatedCost = Number(item.products?.unit_price || item.unit_price) * 0.6;
          const costPerUnit = Number(productCost || estimatedCost || 0);
          totalCost += qty * costPerUnit;
        } else if (!item.batch_id) {
          console.warn(`Order item for product ${item.product_id} has no batch_id; stock not decremented`);
        }

        // Create stock movement (OUT) with positive quantity
        await supabase.from('stock_movements').insert({
          product_id: item.product_id,
          batch_id: item.batch_id,
          movement_type: 'OUT',
          quantity: qty,
          reference_type: 'ORDER',
          reference_id: order_id,
          notes: `${payment_method} payment for order ${order.order_number}`,
          created_by: user.id
        });
      }

      // Record financial transaction
      try {
        const profit = Number(amount) - totalCost;

        await supabase.from('financial_transactions').insert({
          order_id,
          transaction_type: 'sale',
          amount: Number(amount),
          cost: totalCost,
          profit: profit,
          payment_method: payment_method,
          notes: `Sale completed via ${payment_method}`,
          transaction_at: new Date().toISOString()
        });

        console.log(`✅ Recorded financial transaction: Revenue ${amount}, Cost ${totalCost}, Profit ${profit}`);
      } catch (finError) {
        console.error('Failed to record financial transaction:', finError);
        // Don't fail the payment, just log the error
      }

      // Check if an invoice already exists for this order (e.g., from payment link flow)
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', order_id)
        .maybeSingle();

      let invoice;
      if (existingInvoice) {
        // Update existing invoice to paid
        const { data: updatedInvoice, error: updateInvoiceError } = await supabase
          .from('invoices')
          .update({
            paid_amount: amount,
            status: 'paid'
          })
          .eq('id', existingInvoice.id)
          .select()
          .single();

        if (updateInvoiceError) {
          console.error('Error updating invoice:', updateInvoiceError);
        } else {
          invoice = updatedInvoice;
          console.log(`✅ Updated existing invoice ${existingInvoice.invoice_number} to paid`);
        }
      } else {
        // Generate new invoice (paid for cash/terminal)
        const { data: invoiceNumberData } = await supabase.rpc('generate_invoice_number');
        const invoice_number = invoiceNumberData || `INV-${Date.now()}`;

        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_number,
            order_id,
            customer_id: order.customer_id,
            total_amount: order.total_amount,
            tax_amount: order.tax_amount,
            paid_amount: amount,
            status: 'paid',
            created_by: user.id
          })
          .select()
          .single();

        if (invoiceError) {
          console.error('Error creating invoice:', invoiceError);
        } else {
          invoice = newInvoice;
        }
      }

      if (invoice) {
        // Trigger PDF generation & sending
        try {
          await supabase.functions.invoke('generate-invoice-pdf', {
            body: { invoice_id: invoice.id }
          });

          await supabase.functions.invoke('send-invoice', {
            body: { invoice_id: invoice.id }
          });
        } catch (invoiceProcessError) {
          console.error('Error processing invoice PDF/delivery:', invoiceProcessError);
        }
      }

      console.log(`✅ ${payment_method} payment processed for order ${order_id}`);
      return new Response(
        JSON.stringify({ 
          success: true,
          payment,
          invoice,
          message: `${payment_method} payment processed successfully`
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
        amount: Math.round(Number(amount) * 100), // Convert to cents
        currency: 'ZAR',
        successUrl: metadata?.successUrl || `${frontendUrl}/payment/success?orderId=${order_id}`,
        cancelUrl: metadata?.cancelUrl || `${frontendUrl}/payment/cancel?orderId=${order_id}`,
        failureUrl: metadata?.failureUrl || `${frontendUrl}/payment/failure?orderId=${order_id}`,
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
          checkout_id: yocoData.id,
          created_by: user.id
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
      }

      console.log(`✅ Yoco checkout created for order ${order_id}: ${yocoData.redirectUrl}`);
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
