-- Add RPC functions for safe batch quantity management
-- These functions provide atomic updates with validation to prevent negative stock

-- Function to decrement batch quantity (used when orders are placed)
CREATE OR REPLACE FUNCTION decrement_batch_quantity(
  p_batch_id UUID,
  p_quantity DECIMAL
) RETURNS VOID AS $$
DECLARE
  v_current_quantity DECIMAL;
BEGIN
  -- Get current quantity with row lock
  SELECT quantity INTO v_current_quantity
  FROM product_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  -- Check if batch exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch with id % not found', p_batch_id;
  END IF;

  -- Check if sufficient stock available
  IF v_current_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock in batch %. Available: %, Requested: %', 
      p_batch_id, v_current_quantity, p_quantity;
  END IF;

  -- Update the batch quantity
  UPDATE product_batches
  SET quantity = quantity - p_quantity
  WHERE id = p_batch_id;
  
END;
$$ LANGUAGE plpgsql;

-- Function to increment batch quantity (used when refunds/returns are processed)
CREATE OR REPLACE FUNCTION increment_batch_quantity(
  p_batch_id UUID,
  p_quantity DECIMAL
) RETURNS VOID AS $$
BEGIN
  -- Check if batch exists
  IF NOT EXISTS (SELECT 1 FROM product_batches WHERE id = p_batch_id) THEN
    RAISE EXCEPTION 'Batch with id % not found', p_batch_id;
  END IF;

  -- Increment the batch quantity
  UPDATE product_batches
  SET quantity = quantity + p_quantity
  WHERE id = p_batch_id;
  
END;
$$ LANGUAGE plpgsql;

-- Add helpful comment
COMMENT ON FUNCTION decrement_batch_quantity IS 'Safely decrements batch quantity with validation to prevent negative stock';
COMMENT ON FUNCTION increment_batch_quantity IS 'Safely increments batch quantity when processing refunds or returns';
