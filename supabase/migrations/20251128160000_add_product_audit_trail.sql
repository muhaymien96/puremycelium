-- Add audit trail columns to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deactivated_reason TEXT,
ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES public.profiles(id);

-- Update existing inactive products with default reason
UPDATE public.products
SET 
  deactivated_reason = CASE 
    WHEN name LIKE 'Test Product%' THEN 'Automated test cleanup'
    ELSE 'Product discontinued'
  END,
  deactivated_at = updated_at
WHERE is_active = false AND deactivated_reason IS NULL;

-- Add check constraint to require reason when deactivating
ALTER TABLE public.products
ADD CONSTRAINT deactivation_reason_required 
CHECK (
  (is_active = true) OR 
  (is_active = false AND deactivated_reason IS NOT NULL AND deactivated_reason != '')
);

-- Add comment for documentation
COMMENT ON COLUMN public.products.deactivated_at IS 'Timestamp when product was deactivated';
COMMENT ON COLUMN public.products.deactivated_reason IS 'Reason for deactivating the product (required when is_active=false)';
COMMENT ON COLUMN public.products.deactivated_by IS 'User ID who deactivated the product';
