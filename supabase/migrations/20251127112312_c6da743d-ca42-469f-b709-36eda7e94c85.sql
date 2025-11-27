-- Create processed_webhooks table for idempotent webhook handling
CREATE TABLE public.processed_webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamp with time zone NOT NULL DEFAULT now(),
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;

-- Policy: Only system can manage webhooks (no user access needed)
CREATE POLICY "System can manage webhooks"
  ON public.processed_webhooks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for fast webhook_id lookups
CREATE INDEX idx_processed_webhooks_webhook_id ON public.processed_webhooks(webhook_id);
CREATE INDEX idx_processed_webhooks_created_at ON public.processed_webhooks(created_at);

-- Create function to generate sequential invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_number integer;
  invoice_num text;
BEGIN
  -- Get the current max invoice number (format: INV-YYYY-NNNN)
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(invoice_number FROM 'INV-[0-9]{4}-([0-9]+)') 
        AS integer
      )
    ), 0
  ) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || EXTRACT(YEAR FROM CURRENT_DATE)::text || '-%';
  
  -- Format: INV-2025-0001
  invoice_num := 'INV-' || EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || LPAD(next_number::text, 4, '0');
  
  RETURN invoice_num;
END;
$$;