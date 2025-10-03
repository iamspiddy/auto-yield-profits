-- Migration: Add decrement_balance function for withdrawal processing
-- This function decreases a user's available balance when processing withdrawals

-- Drop existing function first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS public.decrement_balance(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.decrement_balance(_user_id UUID, _amount NUMERIC);

-- Create the decrement_balance function
CREATE OR REPLACE FUNCTION public.decrement_balance(
    user_id_param UUID,
    amount_param NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    new_balance NUMERIC;
    current_balance NUMERIC;
BEGIN
    -- Get current available balance from user_balances table
    SELECT COALESCE(available_balance, 0) INTO current_balance
    FROM public.user_balances
    WHERE user_id = user_id_param;
    
    -- If no record exists, create one
    IF current_balance IS NULL THEN
        INSERT INTO public.user_balances (user_id, available_balance, invested_balance)
        VALUES (user_id_param, 0, 0)
        ON CONFLICT (user_id) DO NOTHING;
        
        current_balance := 0;
    END IF;
    
    -- Calculate new balance (subtract the amount)
    new_balance := current_balance - amount_param;
    
    -- Check if balance would go negative
    IF new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', current_balance, amount_param;
    END IF;
    
    -- Update user_balances table
    UPDATE public.user_balances 
    SET available_balance = new_balance,
        updated_at = NOW()
    WHERE user_id = user_id_param
    RETURNING available_balance INTO new_balance;
    
    -- Create transaction record
    INSERT INTO public.balance_transactions (
        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        created_at
    ) VALUES (
        user_id_param,
        'withdrawal',
        -amount_param, -- Negative amount for withdrawal
        current_balance,
        new_balance,
        'Withdrawal processed',
        NOW()
    );
    
    RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.decrement_balance(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_balance(UUID, NUMERIC) TO anon;
