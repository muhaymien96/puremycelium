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

    const { invoice_id, send_receipt } = await req.json();

    if (!invoice_id) {
      return new Response(
        JSON.stringify({ error: 'Missing invoice_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending invoice: ${invoice_id}, Receipt mode: ${send_receipt}`);

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

      // Choose email template based on whether it's a receipt or invoice
      const isReceipt = send_receipt && invoice.status === 'paid';
      const emailSubject = isReceipt 
        ? `Payment Received - Thank You! (Invoice ${invoice.invoice_number})`
        : `Invoice ${invoice.invoice_number} from PureMycelium`;
      
      const emailHtml = isReceipt ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c5f2d; margin: 0;">🍄 PureMycelium</h1>
            <p style="color: #666; margin: 5px 0;">Premium Honey & Gourmet Mushrooms</p>
          </div>

          <div style="background: #d4edda; border: 2px solid #28a745; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
            <h2 style="color: #155724; margin: 0 0 10px 0;">✓ Payment Received</h2>
            <p style="color: #155724; font-size: 18px; margin: 0;">Thank you for your payment!</p>
          </div>

          <p>Dear ${customer.first_name} ${customer.last_name},</p>
          
          <p>We are delighted to confirm that your payment has been successfully received. Your order is now confirmed and will be processed shortly.</p>

          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #333; margin-top: 0;">Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Invoice Number:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${invoice.invoice_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Order Number:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${invoice.orders.order_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Payment Date:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${new Date().toLocaleDateString()}</td>
              </tr>
              <tr style="border-top: 2px solid #ddd;">
                <td style="padding: 12px 0; color: #666; font-size: 16px;"><strong>Amount Paid:</strong></td>
                <td style="padding: 12px 0; text-align: right; font-size: 20px; color: #28a745; font-weight: bold;">R${parseFloat(invoice.paid_amount).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #28a745;"><strong>Status:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: #28a745; font-weight: bold;">PAID</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${invoice.pdf_url}" 
               style="background: #2c5f2d; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Download Receipt
            </a>
          </div>

          <div style="background: #e8f4f8; border-left: 4px solid #17a2b8; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; color: #0c5460;">
              <strong>What's Next?</strong><br>
              Your order is now being prepared. We'll notify you once it's ready for collection or delivery.
            </p>
          </div>

          <p>We truly appreciate your business and look forward to serving you with the finest honey and gourmet mushrooms nature has to offer.</p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
          
          <p style="color: #666; font-size: 14px;">
            Warm regards,<br>
            <strong style="color: #2c5f2d;">The PureMycelium Team</strong><br>
            <span style="font-size: 12px; color: #999;">Bringing nature's finest to your table</span>
          </p>

          <p style="color: #999; font-size: 11px; text-align: center; margin-top: 30px;">
            If you have any questions about your order, please don't hesitate to contact us.
          </p>
        </div>
      ` : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c5f2d; margin: 0;">🍄 PureMycelium</h1>
            <p style="color: #666; margin: 5px 0;">Premium Honey & Gourmet Mushrooms</p>
          </div>

          <h2 style="color: #333; border-bottom: 2px solid #2c5f2d; padding-bottom: 10px;">Invoice</h2>
          
          <p>Dear ${customer.first_name} ${customer.last_name},</p>
          <p>Thank you for your order! Please find your invoice details below.</p>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Invoice Number:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${invoice.invoice_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Order Number:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${invoice.orders.order_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Date:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${new Date(invoice.invoice_date).toLocaleDateString()}</td>
              </tr>
              <tr style="border-top: 2px solid #ddd;">
                <td style="padding: 12px 0; color: #666; font-size: 16px;"><strong>Total:</strong></td>
                <td style="padding: 12px 0; text-align: right; font-size: 20px; color: #2c5f2d; font-weight: bold;">R${parseFloat(invoice.total_amount).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${invoice.pdf_url}" 
               style="background: #2c5f2d; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Download Invoice PDF
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            <strong style="color: #2c5f2d;">The PureMycelium Team</strong><br>
            <span style="font-size: 12px; color: #999;">Premium Honey & Gourmet Mushrooms</span>
          </p>
        </div>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: 'PureMycelium <invoices@resend.dev>',
          to: [customer.email],
          subject: emailSubject,
          html: emailHtml,
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