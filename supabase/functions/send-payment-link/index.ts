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
    const { order_id, customer_email, amount, business_profile_id } = body;

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

    // Fetch business settings for branding
    let businessSettings;
    if (business_profile_id) {
      const { data } = await supabase
        .from('business_settings')
        .select('*')
        .eq('id', business_profile_id)
        .single();
      businessSettings = data;
    } else {
      // Fall back to default profile
      const { data } = await supabase
        .from('business_settings')
        .select('*')
        .eq('is_default', true)
        .single();
      businessSettings = data;
    }

    const businessName = businessSettings?.business_name || 'Business';
    const businessEmail = businessSettings?.email || '';
    const businessLogo = businessSettings?.logo_url || '';

    // Create Yoco checkout
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://www.revono.co.za';
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

    // Generate unpaid invoice first
    const { data: invoiceNumberData } = await supabase.rpc('generate_invoice_number');
    const invoice_number = invoiceNumberData || `INV-${Date.now()}`;

    const { data: invoice, error: invoiceError } = await supabase.from('invoices').insert({
      invoice_number,
      order_id,
      customer_id: order.customer_id,
      total_amount: order.total_amount,
      tax_amount: order.tax_amount,
      paid_amount: 0,
      status: 'unpaid', // Keep unpaid until payment received
      created_by: user.id,
      business_profile_id: business_profile_id || null
    })
    .select()
    .single();

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
    }

    // Generate invoice PDF
    let invoicePdfUrl = null;
    if (invoice) {
      try {
        const pdfResponse = await supabase.functions.invoke('generate-invoice-pdf', {
          body: { 
            invoice_id: invoice.id,
            business_profile_id: business_profile_id 
          }
        });
        if (pdfResponse.data?.pdf_url) {
          invoicePdfUrl = pdfResponse.data.pdf_url;
        }
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
      }
    }

    // Send combined invoice + payment link email
    const customerName = order.customers?.first_name 
      ? `${order.customers.first_name} ${order.customers.last_name || ''}`
      : 'Valued Customer';

    try {
      const emailResponse = await resend.emails.send({
        from: `${businessName} <noreply@revono.co.za>`,
        to: [customer_email],
        subject: `Invoice ${invoice_number} from ${businessName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              ${businessLogo ? `<img src="${businessLogo}" alt="${businessName}" style="max-height: 60px; max-width: 200px; margin-bottom: 10px;" />` : ''}
              <h1 style="color: #2c5f2d; margin: 0;">${businessName}</h1>
              ${businessEmail ? `<p style="color: #666; margin: 5px 0;">${businessEmail}</p>` : ''}
            </div>

            <h2 style="color: #333; border-bottom: 2px solid #2c5f2d; padding-bottom: 10px;">Invoice</h2>
            
            <p>Dear ${customerName},</p>
            <p>Thank you for your order! Please find your invoice details below.</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Invoice Number:</strong></td>
                  <td style="padding: 8px 0; text-align: right;">${invoice_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Order Number:</strong></td>
                  <td style="padding: 8px 0; text-align: right;">${order.order_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Date:</strong></td>
                  <td style="padding: 8px 0; text-align: right;">${new Date().toLocaleDateString()}</td>
                </tr>
                <tr style="border-top: 2px solid #ddd;">
                  <td style="padding: 12px 0; color: #666; font-size: 18px;"><strong>Amount Due:</strong></td>
                  <td style="padding: 12px 0; text-align: right; font-size: 24px; color: #2c5f2d; font-weight: bold;">R${(amount).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #d32f2f;"><strong>Status:</strong></td>
                  <td style="padding: 8px 0; text-align: right; color: #d32f2f; font-weight: bold;">UNPAID</td>
                </tr>
              </table>
            </div>

            ${invoicePdfUrl ? `
            <div style="text-align: center; margin: 20px 0;">
              <a href="${invoicePdfUrl}" 
                 style="color: #2c5f2d; text-decoration: none; font-weight: bold;">
                📄 Download Invoice PDF
              </a>
            </div>
            ` : ''}

            <div style="text-align: center; margin: 35px 0;">
              <p style="font-size: 16px; margin-bottom: 15px;">Click below to complete your payment securely:</p>
              <a href="${yocoData.redirectUrl}" 
                 style="background-color: #2c5f2d; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                Pay Now - R${(amount).toFixed(2)}
              </a>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>⏰ Payment Required:</strong> Please complete payment to confirm your order.
              </p>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you have any questions, please don't hesitate to contact us.
            </p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This payment link is secure and provided by Yoco.
            </p>
          </div>
        `,
      });

      console.log('Combined invoice + payment link email sent:', emailResponse);
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
