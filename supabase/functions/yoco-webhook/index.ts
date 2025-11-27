import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-yoco-signature',
};

async function verifyYocoSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expectedSignature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('YOCO_WEBHOOK_SECRET');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const signature = req.headers.get('x-yoco-signature');

    // Verify webhook signature
    if (webhookSecret && signature) {
      const isValid = await verifyYocoSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.warn('Webhook signature verification skipped (secret not configured or signature missing)');
    }

    const event = JSON.parse(rawBody);
    console.log('Received Yoco webhook:', event.type, event.id);

    // Check for duplicate webhook (idempotency)
    const { data: existingWebhook } = await supabase
      .from('processed_webhooks')
      .select('id')
      .eq('webhook_id', event.id)
      .single();

    if (existingWebhook) {
      console.log('Webhook already processed:', event.id);
      return new Response(
        JSON.stringify({ message: 'Webhook already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record webhook as processed
    await supabase.from('processed_webhooks').insert({
      webhook_id: event.id,
      event_type: event.type,
      payload: event
    });

    // Handle payment.succeeded event
    if (event.type === 'payment.succeeded') {
      const order_id = event.payload?.metadata?.order_id;
      if (!order_id) {
        console.error('No order_id in webhook metadata');
        return new Response(
          JSON.stringify({ message: 'No order_id found' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(product_id, batch_id, quantity)')
        .eq('id', order_id)
        .single();

      if (orderError || !order) {
        console.error('Order not found:', orderError);
        return new Response(
          JSON.stringify({ message: 'Order not found' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', order_id);

      // Update payment status
      await supabase
        .from('payments')
        .update({ 
          payment_status: 'completed',
          provider_payment_id: event.payload.id
        })
        .eq('order_id', order_id)
        .eq('payment_status', 'pending');

      // Decrement stock for all order items
      for (const item of order.order_items) {
        // Update batch quantity if batch_id specified
        if (item.batch_id) {
          const { data: batch } = await supabase
            .from('product_batches')
            .select('quantity')
            .eq('id', item.batch_id)
            .single();

          if (batch) {
            await supabase
              .from('product_batches')
              .update({ quantity: Number(batch.quantity) - Number(item.quantity) })
              .eq('id', item.batch_id);
          }
        }

        // Create stock movement (OUT)
        await supabase.from('stock_movements').insert({
          product_id: item.product_id,
          batch_id: item.batch_id,
          movement_type: 'OUT',
          quantity: -Math.abs(item.quantity),
          reference_type: 'ORDER',
          reference_id: order_id,
          notes: `Yoco payment for order ${order.order_number}`
        });
      }

      // Generate invoice
      const { data: invoiceNumberData } = await supabase.rpc('generate_invoice_number');
      const invoice_number = invoiceNumberData || `INV-${Date.now()}`;

      const { data: invoice, error: invoiceError } = await supabase.from('invoices').insert({
        invoice_number,
        order_id,
        customer_id: order.customer_id,
        total_amount: order.total_amount,
        tax_amount: order.tax_amount,
        paid_amount: event.payload.amount / 100, // Convert from cents
        status: 'paid'
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

      console.log(`Payment succeeded for order ${order_id}`);
    }

    // Handle refund.succeeded event
    if (event.type === 'refund.succeeded') {
      const refund_metadata = event.payload?.metadata;
      if (refund_metadata?.refund_id) {
        await supabase
          .from('refunds')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', refund_metadata.refund_id);

        console.log(`Refund completed: ${refund_metadata.refund_id}`);
      }
    }

    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    // Return 200 to prevent Yoco from retrying
    return new Response(
      JSON.stringify({ message: 'Error logged' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
