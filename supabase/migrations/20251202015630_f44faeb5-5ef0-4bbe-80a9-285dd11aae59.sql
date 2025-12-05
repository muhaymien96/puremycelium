-- Add import tracking columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS external_source text,
ADD COLUMN IF NOT EXISTS external_transaction_key text,
ADD COLUMN IF NOT EXISTS transaction_datetime timestamptz;

-- Create unique index for duplicate prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_external_key 
ON orders(external_transaction_key) 
WHERE external_transaction_key IS NOT NULL;

-- Add product name/SKU fallback columns to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS product_name text,
ADD COLUMN IF NOT EXISTS product_sku text;