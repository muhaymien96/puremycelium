import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return new Response(
        JSON.stringify({ error: 'Missing invoice_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending invoice: ${invoice_id}`);

    // Fetch invoice with customer info
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customers(first_name, last_name, email, phone, preferred_channel),
        orders(order_number)
      `)
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if PDF exists
    if (!invoice.pdf_url) {
      console.error('Invoice PDF not generated yet');
      return new Response(
        JSON.stringify({ error: 'Invoice PDF not generated yet. Generate PDF first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customer = invoice.customers;
    const preferredChannel = customer?.preferred_channel || 'NONE';

    // Skip if no channel or NONE
    if (!customer || preferredChannel === 'NONE') {
      console.log('No customer or preferred channel is NONE. Skipping delivery.');
      await supabase
        .from('invoices')
        .update({
          delivery_status: 'generated',
          delivery_channel: null
        })
        .eq('id', invoice_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Invoice generated but not sent (no preferred channel)',
          delivery_status: 'generated'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // EMAIL Delivery
    if (preferredChannel === 'EMAIL') {
      if (!customer.email) {
        console.error('Customer has EMAIL channel but no email address');
        await supabase
          .from('invoices')
          .update({
            delivery_status: 'failed',
            delivery_channel: 'EMAIL',
            delivery_error: 'Customer email address not found'
          })
          .eq('id', invoice_id);

        return new Response(
          JSON.stringify({ error: 'Customer email address not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured');
        await supabase
          .from('invoices')
          .update({
            delivery_status: 'failed',
            delivery_channel: 'EMAIL',
            delivery_error: 'Email service not configured'
          })
          .eq('id', invoice_id);

        return new Response(
          JSON.stringify({ error: 'Email service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const resend = new Resend(resendApiKey);

      try {
        const emailResponse = await resend.emails.send({
          from: 'PureMycelium <invoices@resend.dev>',
          to: [customer.email],
          subject: `Invoice ${invoice.invoice_number} from PureMycelium`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Invoice from PureMycelium</h1>
              <p>Dear ${customer.first_name} ${customer.last_name},</p>
              <p>Thank you for your order! Please find your invoice attached.</p>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>Invoice #:</strong> ${invoice.invoice_number}<br>
                <strong>Order #:</strong> ${invoice.orders.order_number}<br>
                <strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}<br>
                <strong>Total:</strong> R ${parseFloat(invoice.total_amount).toFixed(2)}
              </div>

              <p>
                <a href="${invoice.pdf_url}" 
                   style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Download Invoice PDF
                </a>
              </p>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Best regards,<br>
                <strong>PureMycelium Team</strong><br>
                Premium Honey & Gourmet Mushrooms
              </p>
            </div>
          `,
        });

        console.log('Email sent successfully:', emailResponse);

        await supabase
          .from('invoices')
          .update({
            delivery_status: 'sent',
            delivery_channel: 'EMAIL',
            sent_at: new Date().toISOString(),
            delivery_error: null
          })
          .eq('id', invoice_id);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Invoice sent via email',
            delivery_status: 'sent',
            email_response: emailResponse
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (emailError) {
        console.error('Error sending email:', emailError);
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown email error';

        await supabase
          .from('invoices')
          .update({
            delivery_status: 'failed',
            delivery_channel: 'EMAIL',
            delivery_error: errorMessage
          })
          .eq('id', invoice_id);

        return new Response(
          JSON.stringify({ error: `Failed to send email: ${errorMessage}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // WHATSAPP not implemented yet
    if (preferredChannel === 'WHATSAPP') {
      console.log('WhatsApp delivery not implemented yet');
      await supabase
        .from('invoices')
        .update({
          delivery_status: 'failed',
          delivery_channel: 'WHATSAPP',
          delivery_error: 'WhatsApp delivery not implemented yet'
        })
        .eq('id', invoice_id);

      return new Response(
        JSON.stringify({ error: 'WhatsApp delivery not implemented yet' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown preferred channel' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending invoice:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});