-- Cleanup script: Mark all test products as inactive
-- Run this manually when needed to clean up test data

UPDATE products
SET 
  is_active = false,
  deactivated_at = NOW(),
  deactivated_reason = 'Automated test cleanup',
  deactivated_by = auth.uid(),
  updated_at = NOW()
WHERE 
  name LIKE 'Test Product%'
  AND is_active = true;
