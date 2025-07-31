-- Migration: Add increment_balance function for deposit approval
-- This function safely increments a user's balance

-- Create the increment_balance function
CREATE OR REPLACE FUNCTION increment_balance(
    _user_id UUID,
    _amount NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    _new_balance NUMERIC;
BEGIN
    -- Update the user's balance and return the new balance
    UPDATE profiles 
    SET balance = COALESCE(balance, 0) + _amount
    WHERE user_id = _user_id
    RETURNING balance INTO _new_balance;
    
    -- If no rows were updated, the user doesn't exist
    IF _new_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', _user_id;
    END IF;
    
    RETURN _new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_balance(UUID, NUMERIC) TO authenticated;

-- Create a function to safely decrement balance (for withdrawals)
CREATE OR REPLACE FUNCTION decrement_balance(
    _user_id UUID,
    _amount NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    _current_balance NUMERIC;
    _new_balance NUMERIC;
BEGIN
    -- Get current balance
    SELECT COALESCE(balance, 0) INTO _current_balance
    FROM profiles 
    WHERE user_id = _user_id;
    
    -- Check if user exists
    IF _current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', _user_id;
    END IF;
    
    -- Check if user has sufficient balance
    IF _current_balance < _amount THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', _current_balance, _amount;
    END IF;
    
    -- Update the balance
    UPDATE profiles 
    SET balance = _current_balance - _amount
    WHERE user_id = _user_id
    RETURNING balance INTO _new_balance;
    
    RETURN _new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION decrement_balance(UUID, NUMERIC) TO authenticated; 