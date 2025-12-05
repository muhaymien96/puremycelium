import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import jsPDF from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to fetch and convert image to base64
async function fetchImageAsBase64(url: string): Promise<{ base64: string; type: 'PNG' | 'JPEG' } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch image');
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    
    // Determine image type
    const type = url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
    
    return { base64, type };
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invoice_id, order_id, business_profile_id, is_receipt } = await req.json();

    let invoiceId = invoice_id;

    // If order_id is provided instead of invoice_id, find or create the invoice
    if (!invoiceId && order_id) {
      console.log(`Looking up or creating invoice for order: ${order_id}`);
      
      // Check if invoice already exists for this order
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('order_id', order_id)
        .maybeSingle();

      if (existingInvoice) {
        invoiceId = existingInvoice.id;
        console.log(`Found existing invoice: ${invoiceId}`);
      } else {
        // Create invoice from order
        const { data: order } = await supabase
          .from('orders')
          .select('*')
          .eq('id', order_id)
          .single();

        if (!order) {
          return new Response(
            JSON.stringify({ error: 'Order not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate invoice number
        const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');

        const { data: newInvoice, error: createError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            order_id: order.id,
            customer_id: order.customer_id,
            invoice_date: new Date().toISOString().split('T')[0],
            total_amount: order.total_amount,
            tax_amount: order.tax_amount,
            status: (order.status === 'completed' || order.status === 'delivered') ? 'paid' : 'unpaid',
            business_profile_id: business_profile_id
          })
          .select('id')
          .single();

        if (createError || !newInvoice) {
          console.error('Error creating invoice:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create invoice' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        invoiceId = newInvoice.id;
        console.log(`Created new invoice: ${invoiceId}`);
      }
    }

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'Missing invoice_id or order_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const documentType = is_receipt ? 'RECEIPT' : 'INVOICE';
    console.log(`Generating ${documentType} PDF for invoice: ${invoiceId}`);

    // If generating a receipt, mark the invoice as paid
    if (is_receipt) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', invoiceId);
      
      if (updateError) {
        console.error('Failed to mark invoice as paid:', updateError);
        // Continue anyway - we still want to generate the receipt
      } else {
        console.log(`Marked invoice ${invoiceId} as paid`);
      }
    }

    // Fetch invoice with related data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        orders!inner(
          order_number,
          created_at,
          delivery_fee,
          status,
          order_items(
            quantity,
            unit_price,
            subtotal,
            products(name, sku)
          )
        ),
        customers(first_name, last_name, email, phone, address, city, postal_code, country)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which business profile to use
    const profileId = business_profile_id || invoice.business_profile_id;
    
    // Fetch business settings for branding
    let businessSettings;
    if (profileId) {
      const { data } = await supabase
        .from('business_settings')
        .select('*')
        .eq('id', profileId)
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

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header - Try to add logo if available
    let logoAdded = false;
    if (businessSettings?.logo_url) {
      const imageData = await fetchImageAsBase64(businessSettings.logo_url);
      if (imageData) {
        try {
          // Calculate proportional dimensions to maintain aspect ratio
          const maxWidth = 35;
          const maxHeight = 20;
          // Assume a reasonable aspect ratio, scale to fit within bounds
          let logoWidth = maxWidth;
          let logoHeight = maxHeight;
          // Use maxWidth as primary constraint, let height be proportional
          // For better fit, we use a 2:1 width:height ratio as default
          logoHeight = logoWidth / 2.5;
          if (logoHeight > maxHeight) {
            logoHeight = maxHeight;
            logoWidth = logoHeight * 2.5;
          }
          
          doc.addImage(
            `data:image/${imageData.type.toLowerCase()};base64,${imageData.base64}`,
            imageData.type,
            pageWidth / 2 - logoWidth / 2,
            yPos - 5,
            logoWidth,
            logoHeight
          );
          yPos += logoHeight + 5;
          logoAdded = true;
          console.log('Logo added successfully');
        } catch (imgError) {
          console.error('Error adding logo to PDF:', imgError);
        }
      }
    }

    // Company Name (always show, below logo or as main header)
    doc.setFontSize(logoAdded ? 18 : 24);
    doc.setFont('helvetica', 'bold');
    doc.text(businessSettings?.business_name || 'Revono', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Business details subtitle
    if (businessSettings?.address || businessSettings?.city) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const addressLine = [
        businessSettings?.address,
        businessSettings?.city,
        businessSettings?.country
      ].filter(Boolean).join(', ');
      if (addressLine) {
        doc.text(addressLine, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
    }
    
    if (businessSettings?.email || businessSettings?.phone) {
      doc.setFontSize(9);
      const contactLine = [
        businessSettings?.email,
        businessSettings?.phone
      ].filter(Boolean).join(' | ');
      if (contactLine) {
        doc.text(contactLine, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
    }

    if (businessSettings?.vat_number) {
      doc.setFontSize(9);
      doc.text(`VAT: ${businessSettings.vat_number}`, pageWidth / 2, yPos, { align: 'center' });
    }
    
    yPos += 10;

    // Document Type Header (INVOICE or RECEIPT)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(documentType, 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    // For receipts, show "Receipt #:" without the INV prefix; for invoices show "Invoice #:"
    if (is_receipt) {
      const receiptNumber = invoice.invoice_number.replace('INV-', '');
      doc.text(`Receipt #: REC-${receiptNumber}`, 20, yPos);
    } else {
      doc.text(`Invoice #: ${invoice.invoice_number}`, 20, yPos);
    }
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, pageWidth - 70, yPos);
    yPos += 6;
    
    if (invoice.due_date && !is_receipt) {
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

    // Add delivery fee if present
    if (invoice.orders.delivery_fee && parseFloat(invoice.orders.delivery_fee) > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text('Delivery', 22, yPos);
      doc.text('1', pageWidth - 90, yPos);
      doc.text(`R ${parseFloat(invoice.orders.delivery_fee).toFixed(2)}`, pageWidth - 70, yPos);
      doc.text(`R ${parseFloat(invoice.orders.delivery_fee).toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
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
    
    if (is_receipt) {
      // For receipts, always show PAID - THANK YOU in green
      doc.setTextColor(34, 197, 94);
      doc.text('PAID - THANK YOU', totalsX, yPos);
      doc.setTextColor(0, 0, 0);
    } else {
      // For invoices, determine status dynamically
      const { data: completedPayment } = await supabase
        .from('payments')
        .select('payment_status')
        .eq('order_id', invoice.order_id)
        .eq('payment_status', 'completed')
        .maybeSingle();

      const orderStatus = invoice.orders.status;
      const isPaid = invoice.status === 'paid' || 
                     orderStatus === 'completed' || 
                     orderStatus === 'delivered' || 
                     !!completedPayment;

      const statusText = isPaid ? 'PAID' : 'UNPAID';
      const statusColor = isPaid ? [34, 197, 94] : [239, 68, 68];
      doc.setTextColor(...statusColor);
      doc.text(`Status: ${statusText}`, totalsX, yPos);
      doc.setTextColor(0, 0, 0);
    }
    yPos += 7;

    if (invoice.paid_amount && parseFloat(invoice.paid_amount) > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Paid Amount: R ${parseFloat(invoice.paid_amount).toFixed(2)}`, totalsX, yPos);
      yPos += 7;
    }

    // Footer with custom text and banking details
    yPos = doc.internal.pageSize.getHeight() - 40;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    
    // Use receipt_footer_text for receipts, invoice_footer_text for invoices
    const footerText = is_receipt 
      ? (businessSettings?.receipt_footer_text || 'Thank you for your purchase!')
      : (businessSettings?.invoice_footer_text || 'Thank you for your business!');
    doc.text(footerText, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    
    if (businessSettings?.email) {
      doc.text(`For inquiries: ${businessSettings.email}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
    
    // Banking details (only for invoices, not receipts)
    if (!is_receipt && (businessSettings?.bank_name || businessSettings?.bank_account_number)) {
      yPos += 3;
      doc.setFont('helvetica', 'bold');
      doc.text('Banking Details:', pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      
      if (businessSettings?.bank_name) {
        doc.text(`Bank: ${businessSettings.bank_name}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
      }
      if (businessSettings?.bank_account_number) {
        doc.text(`Account: ${businessSettings.bank_account_number}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
      }
      if (businessSettings?.bank_branch_code) {
        doc.text(`Branch Code: ${businessSettings.bank_branch_code}`, pageWidth / 2, yPos, { align: 'center' });
      }
    }

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');
    const pdfArray = new Uint8Array(pdfBuffer);

    // Upload to Supabase Storage
    const receiptNumber = invoice.invoice_number.replace('INV-', '');
    const fileName = is_receipt 
      ? `REC-${receiptNumber}.pdf`
      : `${invoice.invoice_number}.pdf`;
      
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
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      throw updateError;
    }

    console.log(`${documentType} PDF generated successfully: ${pdfUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: pdfUrl,
        invoice_number: invoice.invoice_number,
        document_type: documentType
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
