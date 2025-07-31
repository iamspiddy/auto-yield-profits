-- Migration: Prevent duplicate transaction records
-- This prevents multiple transaction records for the same deposit

-- Add unique constraint to prevent duplicate transactions for the same deposit
ALTER TABLE transactions 
ADD CONSTRAINT unique_deposit_transaction 
UNIQUE (reference_id, type, user_id);

-- Add index to improve performance
CREATE INDEX IF NOT EXISTS idx_transactions_reference_type 
ON transactions (reference_id, type);

-- Add constraint to ensure deposit can only be approved once
ALTER TABLE deposits 
ADD CONSTRAINT check_deposit_status_once 
CHECK (
  (status = 'pending' AND verified_at IS NULL AND verified_by IS NULL) OR
  (status = 'approved' AND verified_at IS NOT NULL AND verified_by IS NOT NULL) OR
  (status = 'rejected' AND verified_at IS NOT NULL AND verified_by IS NOT NULL)
); 