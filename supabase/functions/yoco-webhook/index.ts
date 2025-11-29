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

      // Get order details with batch cost info
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(product_id, batch_id, quantity, unit_price, product_batches(cost_per_unit))')
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

      // Update payment status (preserve checkout_id, add provider_payment_id)
      await supabase
        .from('payments')
        .update({ 
          payment_status: 'completed',
          provider_payment_id: event.payload.id
        })
        .eq('order_id', order_id)
        .eq('payment_status', 'pending');

      // Decrement stock for all order items
      let totalCost = 0;
      for (const item of order.order_items) {
        const quantity = Number(item.quantity);

        if (!item.batch_id) {
          console.warn(`Order item ${item.product_id} has no batch_id; skipping stock decrement`);
        } else if (!Number.isFinite(quantity) || quantity <= 0) {
          console.warn(`Invalid quantity for order item ${item.product_id}:`, item.quantity);
        } else {
          // Update batch quantity using RPC function for atomic update
          const { error: batchError } = await supabase.rpc('decrement_batch_quantity', {
            p_batch_id: item.batch_id,
            p_quantity: quantity,
          });

          if (batchError) {
            console.error('Error decrementing batch:', batchError);
          } else {
            console.log(`✅ Decremented batch ${item.batch_id} by ${quantity}`);
          }

          // Calculate cost from batch
          const costPerUnit = item.product_batches?.cost_per_unit || 0;
          totalCost += quantity * Number(costPerUnit);
        }

        // Create stock movement (OUT) with positive quantity
        await supabase.from('stock_movements').insert({
          product_id: item.product_id,
          batch_id: item.batch_id,
          movement_type: 'OUT',
          quantity: Number(item.quantity),
          reference_type: 'ORDER',
          reference_id: order_id,
          notes: `Yoco payment for order ${order.order_number}`
        });
      }

      // Record financial transaction
      try {
        const amount = event.payload.amount / 100; // Convert from cents
        const profit = amount - totalCost;

        await supabase.from('financial_transactions').insert({
          order_id,
          transaction_type: 'sale',
          amount: amount,
          cost: totalCost,
          profit: profit,
          payment_method: 'PAYMENT_LINK',
          notes: 'Sale completed via Yoco payment link'
        });

        console.log(`✅ Recorded financial transaction: Revenue ${amount}, Cost ${totalCost}, Profit ${profit}`);
      } catch (finError) {
        console.error('Failed to record financial transaction:', finError);
      }

      // Find existing invoice and update to paid
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', order_id)
        .single();

      if (existingInvoice) {
        // Update existing invoice to paid
        await supabase.from('invoices').update({
          paid_amount: event.payload.amount / 100,
          status: 'paid'
        }).eq('id', existingInvoice.id);

        // Regenerate PDF with "PAID" status
        try {
          await supabase.functions.invoke('generate-invoice-pdf', {
            body: { invoice_id: existingInvoice.id }
          });

          await supabase.functions.invoke('send-invoice', {
            body: { invoice_id: existingInvoice.id, send_receipt: true }
          });
        } catch (error) {
          console.error('Error updating invoice:', error);
        }
      } else {
        // Fallback: create new invoice if none exists
        const { data: invoiceNumberData } = await supabase.rpc('generate_invoice_number');
        const invoice_number = invoiceNumberData || `INV-${Date.now()}`;

        const { data: invoice, error: invoiceError } = await supabase.from('invoices').insert({
          invoice_number,
          order_id,
          customer_id: order.customer_id,
          total_amount: order.total_amount,
          tax_amount: order.tax_amount,
          paid_amount: event.payload.amount / 100,
          status: 'paid'
        })
        .select()
        .single();

        if (!invoiceError && invoice) {
          try {
            await supabase.functions.invoke('generate-invoice-pdf', {
              body: { invoice_id: invoice.id }
            });
            await supabase.functions.invoke('send-invoice', {
              body: { invoice_id: invoice.id, send_receipt: true }
            });
          } catch (error) {
            console.error('Error processing new invoice:', error);
          }
        }
      }

      console.log(`✅ Payment succeeded for order ${order_id}`);
    }

    // Handle refund.succeeded event
    if (event.type === 'refund.succeeded') {
      const refund_metadata = event.payload?.metadata;
      if (refund_metadata?.refund_id) {
        // Get refund details
        const { data: refund } = await supabase
          .from('refunds')
          .select('*, orders(id, order_number)')
          .eq('id', refund_metadata.refund_id)
          .single();

        await supabase
          .from('refunds')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', refund_metadata.refund_id);

        // Restore stock for refunded items
        if (refund?.orders?.id) {
          try {
            const { data: orderItems } = await supabase
              .from('order_items')
              .select('*, product_batches(cost_per_unit)')
              .eq('order_id', refund.orders.id);

            if (orderItems && orderItems.length > 0) {
              for (const item of orderItems) {
                if (item.batch_id) {
                  const qty = Number(item.quantity);

                  if (!Number.isFinite(qty) || qty <= 0) {
                    console.warn(`Invalid quantity for refund stock restore:`, item.quantity);
                  } else {
                    // Increment batch quantity
                    const { error: rpcError } = await supabase.rpc('increment_batch_quantity', {
                      p_batch_id: item.batch_id,
                      p_quantity: qty
                    });

                    if (rpcError) {
                      console.error('Error incrementing batch quantity:', rpcError);
                    } else {
                      console.log(`✅ Incremented batch ${item.batch_id} by ${qty}`);
                    }

                    // Create stock movement record
                    await supabase.from('stock_movements').insert({
                      product_id: item.product_id,
                      batch_id: item.batch_id,
                      quantity: qty,
                      movement_type: 'IN',
                      reference_type: 'REFUND',
                      reference_id: refund_metadata.refund_id,
                      notes: `Yoco refund - stock restored for order ${refund.orders.order_number}`
                    });
                  }
                }
              }
            }
          } catch (stockError) {
            console.error('Error restoring stock for Yoco refund:', stockError);
          }
        }

        // Record financial transaction reversal
        if (refund?.orders?.id) {
          try {
            const { data: originalTx } = await supabase
              .from('financial_transactions')
              .select('*')
              .eq('order_id', refund.orders.id)
              .eq('transaction_type', 'sale')
              .single();

            if (originalTx) {
              const refundAmount = event.payload.amount / 100;
              const fraction = refundAmount / originalTx.amount;
              
              await supabase.from('financial_transactions').insert({
                order_id: refund.orders.id,
                transaction_type: 'refund',
                amount: -refundAmount,
                cost: -(originalTx.cost * fraction),
                profit: -(originalTx.profit * fraction),
                payment_method: 'PAYMENT_LINK',
                notes: `Yoco refund completed for order ${refund.orders.order_number}`
              });

              console.log(`✅ Recorded financial reversal for Yoco refund ${refund_metadata.refund_id}`);
            }
          } catch (finError) {
            console.error('Failed to record financial reversal:', finError);
          }
        }

        console.log(`✅ Refund completed: ${refund_metadata.refund_id}`);
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
