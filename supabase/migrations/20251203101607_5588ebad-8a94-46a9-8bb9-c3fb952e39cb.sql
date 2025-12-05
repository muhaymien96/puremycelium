-- Phase 1: Set cost_price = 60% of unit_price for all products where cost_price is NULL
UPDATE products 
SET cost_price = unit_price * 0.6, 
    updated_at = NOW() 
WHERE cost_price IS NULL;