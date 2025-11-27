-- Add preferred_channel to customers table
ALTER TABLE customers 
ADD COLUMN preferred_channel TEXT DEFAULT 'NONE' 
  CHECK (preferred_channel IN ('EMAIL', 'WHATSAPP', 'NONE'));

-- Enhance invoices table with PDF & delivery tracking
ALTER TABLE invoices 
ADD COLUMN pdf_url TEXT,
ADD COLUMN delivery_status TEXT DEFAULT 'pending' 
  CHECK (delivery_status IN ('pending', 'generated', 'sent', 'failed')),
ADD COLUMN delivery_channel TEXT,
ADD COLUMN delivery_error TEXT,
ADD COLUMN sent_at TIMESTAMPTZ;

-- Create storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', true);

-- RLS policy: Authenticated users can read invoices
CREATE POLICY "Authenticated users can read invoices" 
ON storage.objects
FOR SELECT 
USING (bucket_id = 'invoices' AND auth.uid() IS NOT NULL);

-- RLS policy: Service role can insert invoices  
CREATE POLICY "Service role can insert invoices" 
ON storage.objects
FOR INSERT 
WITH CHECK (bucket_id = 'invoices');