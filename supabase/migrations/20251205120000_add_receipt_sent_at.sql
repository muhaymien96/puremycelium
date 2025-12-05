-- Add receipt_sent_at column to invoices for idempotent receipt sending
-- This prevents duplicate receipts from being sent due to race conditions

ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ;

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_invoices_receipt_sent_at ON public.invoices(receipt_sent_at) WHERE receipt_sent_at IS NOT NULL;

COMMENT ON COLUMN public.invoices.receipt_sent_at IS 'Timestamp when receipt email was sent. Set BEFORE sending to prevent race conditions.';
