import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import jsPDF from "https://esm.sh/jspdf@2.5.2";

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return new Response(
        JSON.stringify({ error: 'Missing invoice_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating PDF for invoice: ${invoice_id}`);

    // Fetch invoice with related data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        orders!inner(
          order_number,
          created_at,
          order_items(
            quantity,
            unit_price,
            subtotal,
            products(name, sku)
          )
        ),
        customers(first_name, last_name, email, phone, address, city, postal_code, country)
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

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header - Company Name
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('PureMycelium', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Premium Honey & Gourmet Mushrooms', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Invoice Details
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${invoice.invoice_number}`, 20, yPos);
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, pageWidth - 70, yPos);
    yPos += 6;
    
    if (invoice.due_date) {
      doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, pageWidth - 70, yPos);
      yPos += 6;
    }
    
    doc.text(`Order #: ${invoice.orders.order_number}`, 20, yPos);
    yPos += 15;

    // Customer Details
    if (invoice.customers) {
      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO:', 20, yPos);
      yPos += 6;

      doc.setFont('helvetica', 'normal');
      doc.text(`${invoice.customers.first_name} ${invoice.customers.last_name}`, 20, yPos);
      yPos += 5;

      if (invoice.customers.address) {
        doc.text(invoice.customers.address, 20, yPos);
        yPos += 5;
      }

      if (invoice.customers.city) {
        const cityLine = `${invoice.customers.city}${invoice.customers.postal_code ? ', ' + invoice.customers.postal_code : ''}`;
        doc.text(cityLine, 20, yPos);
        yPos += 5;
      }

      if (invoice.customers.email) {
        doc.text(`Email: ${invoice.customers.email}`, 20, yPos);
        yPos += 5;
      }

      if (invoice.customers.phone) {
        doc.text(`Phone: ${invoice.customers.phone}`, 20, yPos);
        yPos += 5;
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.text('Walk-in Customer', 20, yPos);
      yPos += 5;
    }

    yPos += 10;

    // Line Items Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, pageWidth - 40, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Product', 22, yPos);
    doc.text('Qty', pageWidth - 90, yPos);
    doc.text('Unit Price', pageWidth - 70, yPos);
    doc.text('Subtotal', pageWidth - 35, yPos, { align: 'right' });
    yPos += 10;

    // Line Items
    doc.setFont('helvetica', 'normal');
    for (const item of invoice.orders.order_items) {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      const productName = item.products?.name || 'Product';
      doc.text(productName, 22, yPos);
      doc.text(item.quantity.toString(), pageWidth - 90, yPos);
      doc.text(`R ${parseFloat(item.unit_price).toFixed(2)}`, pageWidth - 70, yPos);
      doc.text(`R ${parseFloat(item.subtotal).toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
      yPos += 7;
    }

    yPos += 10;

    // Totals
    const totalsX = pageWidth - 70;
    const subtotalAmount = parseFloat(invoice.total_amount) - parseFloat(invoice.tax_amount || '0');
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX, yPos);
    doc.text(`R ${subtotalAmount.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 7;

    if (invoice.tax_amount && parseFloat(invoice.tax_amount) > 0) {
      doc.text('VAT (15%):', totalsX, yPos);
      doc.text(`R ${parseFloat(invoice.tax_amount).toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
      yPos += 7;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', totalsX, yPos);
    doc.text(`R ${parseFloat(invoice.total_amount).toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 10;

    // Payment Status
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const statusText = invoice.status === 'paid' ? 'PAID' : 'UNPAID';
    const statusColor = invoice.status === 'paid' ? [34, 197, 94] : [239, 68, 68];
    doc.setTextColor(...statusColor);
    doc.text(`Status: ${statusText}`, totalsX, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 7;

    if (invoice.paid_amount && parseFloat(invoice.paid_amount) > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Paid Amount: R ${parseFloat(invoice.paid_amount).toFixed(2)}`, totalsX, yPos);
      yPos += 7;
    }

    // Footer
    yPos = doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your business! ', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text('For inquiries, contact us at info@puremycelium.co.za', pageWidth / 2, yPos, { align: 'center' });

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');
    const pdfArray = new Uint8Array(pdfBuffer);

    // Upload to Supabase Storage
    const fileName = `${invoice.invoice_number}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfArray, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // Update invoice with PDF URL
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        pdf_url: pdfUrl,
        delivery_status: 'generated'
      })
      .eq('id', invoice_id);

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      throw updateError;
    }

    console.log(`PDF generated successfully: ${pdfUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: pdfUrl,
        invoice_number: invoice.invoice_number
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});