-- Migration: Fix increment_balance function with proper parameter names
-- This fixes the "function not found" error by using correct parameter names

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.increment_balance(UUID, NUMERIC);

-- Recreate the function with proper signature
CREATE OR REPLACE FUNCTION public.increment_balance(
    user_id_param UUID,
    amount_param NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    new_balance NUMERIC;
BEGIN
    UPDATE profiles 
    SET balance = COALESCE(balance, 0) + amount_param
    WHERE user_id = user_id_param
    RETURNING balance INTO new_balance;
    
    IF new_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', user_id_param;
    END IF;
    
    RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.increment_balance(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_balance(UUID, NUMERIC) TO anon; 