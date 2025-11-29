-- Add cost tracking to product_batches
ALTER TABLE product_batches
ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * cost_per_unit) STORED;

-- Create financial_transactions table
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'refund', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) DEFAULT 0,
  profit DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_order ON financial_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_created ON financial_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);

-- Enable RLS
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'financial_transactions' 
    AND policyname = 'Allow authenticated users to read financial transactions'
  ) THEN
    CREATE POLICY "Allow authenticated users to read financial transactions"
    ON financial_transactions FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'financial_transactions' 
    AND policyname = 'Allow authenticated users to insert financial transactions'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert financial transactions"
    ON financial_transactions FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE financial_transactions IS 'Tracks all financial transactions including sales, refunds, and adjustments with profit calculation';
COMMENT ON COLUMN product_batches.cost_per_unit IS 'Cost per unit for this batch, used to calculate profit margins';
COMMENT ON COLUMN product_batches.total_cost IS 'Total cost of the batch (quantity * cost_per_unit)';
