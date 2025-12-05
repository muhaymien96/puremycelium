-- Drop duplicate integer versions of batch quantity functions to fix PGRST203 error
DROP FUNCTION IF EXISTS public.decrement_batch_quantity(uuid, integer);
DROP FUNCTION IF EXISTS public.increment_batch_quantity(uuid, integer);

-- Add delivery_fee column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0;

-- Add default_delivery_fee to business_settings
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS default_delivery_fee numeric DEFAULT 50;