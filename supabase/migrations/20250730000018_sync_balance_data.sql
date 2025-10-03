-- Migration: Sync existing balance data from profiles to user_balances table
-- This ensures all existing balance data is available in the dashboard

-- Insert or update user_balances records for all users who have a balance in profiles
INSERT INTO public.user_balances (user_id, available_balance, invested_balance, created_at, updated_at)
SELECT 
    p.user_id,
    COALESCE(p.balance, 0) as available_balance,
    0 as invested_balance,
    NOW() as created_at,
    NOW() as updated_at
FROM public.profiles p
WHERE p.balance IS NOT NULL AND p.balance > 0
ON CONFLICT (user_id) DO UPDATE SET
    available_balance = COALESCE(EXCLUDED.available_balance, user_balances.available_balance),
    updated_at = NOW();

-- Create balance transaction records for the synced balances
INSERT INTO public.balance_transactions (
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    created_at
)
SELECT 
    p.user_id,
    'admin_adjustment' as transaction_type,
    COALESCE(p.balance, 0) as amount,
    0 as balance_before,
    COALESCE(p.balance, 0) as balance_after,
    'Initial balance sync from profiles table' as description,
    NOW() as created_at
FROM public.profiles p
WHERE p.balance IS NOT NULL AND p.balance > 0
AND NOT EXISTS (
    SELECT 1 FROM public.balance_transactions bt 
    WHERE bt.user_id = p.user_id 
    AND bt.description = 'Initial balance sync from profiles table'
);
