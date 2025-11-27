-- Add checkout_id column to payments table to store Yoco checkout ID
ALTER TABLE payments ADD COLUMN checkout_id text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_checkout_id ON payments(checkout_id);