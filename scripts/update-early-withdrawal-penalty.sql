-- Update early withdrawal penalty from 10% to 50% for all existing investments
UPDATE investments 
SET early_withdrawal_penalty_percent = 50.00 
WHERE early_withdrawal_penalty_percent = 10.00;

-- Verify the update
SELECT id, user_id, early_withdrawal_penalty_percent, created_at 
FROM investments 
WHERE early_withdrawal_penalty_percent = 50.00 
ORDER BY created_at DESC 
LIMIT 10;
