-- Backfill transaction_at from created_at where it's NULL
UPDATE public.financial_transactions 
SET transaction_at = created_at 
WHERE transaction_at IS NULL;