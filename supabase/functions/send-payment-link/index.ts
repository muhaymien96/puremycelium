import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const resend = new Resend(resendApiKey);

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
    const { order_id, customer_email, amount } = body;

    if (!order_id || !customer_email || amount === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: order_id, customer_email, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!yocoSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Yoco API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify order exists and get details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customers(first_name, last_name, email)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Yoco checkout
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://yxjygrsmxrsmdzubzpsj.lovable.app';
    const checkoutPayload = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'ZAR',
      successUrl: `${frontendUrl}/payment/success?orderId=${order_id}`,
      cancelUrl: `${frontendUrl}/payment/cancel?orderId=${order_id}`,
      failureUrl: `${frontendUrl}/payment/failure?orderId=${order_id}`,
      metadata: {
        order_id,
        order_number: order.order_number,
        user_id: user.id,
      }
    };

    console.log('Creating Yoco checkout for email:', checkoutPayload);

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
        payment_method: 'PAYMENT_LINK',
        payment_status: 'pending',
        provider_payment_id: yocoData.id,
        created_by: user.id,
        notes: `Payment link sent to ${customer_email}`
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
    }

    // Send email with payment link
    const customerName = order.customers?.first_name 
      ? `${order.customers.first_name} ${order.customers.last_name || ''}`
      : 'Valued Customer';

    try {
      const emailResponse = await resend.emails.send({
        from: "PureMycelium <onboarding@resend.dev>",
        to: [customer_email],
        subject: `Payment Link for Order ${order.order_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Complete Your Payment</h2>
            <p>Hello ${customerName},</p>
            <p>Thank you for your order! Please click the button below to complete your payment securely:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${yocoData.redirectUrl}" 
                 style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                Pay Now - R${(amount).toFixed(2)}
              </a>
            </div>
            <p><strong>Order Details:</strong></p>
            <ul>
              <li>Order Number: ${order.order_number}</li>
              <li>Total Amount: R${(amount).toFixed(2)}</li>
            </ul>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This payment link is secure and provided by Yoco. If you didn't request this payment, please ignore this email.
            </p>
          </div>
        `,
      });

      console.log('Payment link email sent:', emailResponse);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails - payment link is still created
    }

    console.log(`Payment link created and sent to ${customer_email} for order ${order_id}`);
    return new Response(
      JSON.stringify({ 
        success: true,
        checkout_url: yocoData.redirectUrl,
        checkout_id: yocoData.id,
        payment,
        customer_email,
        message: 'Payment link sent to customer'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in send-payment-link function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
