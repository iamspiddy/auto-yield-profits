-- Fix enum type issues for withdrawals and transactions
-- This migration creates helper functions to handle enum type casting properly

-- Create helper function to create withdrawals with proper type casting
CREATE OR REPLACE FUNCTION create_withdrawal(
  p_user_id UUID,
  p_amount DECIMAL,
  p_wallet_address TEXT,
  p_withdrawal_type TEXT DEFAULT 'earnings'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_withdrawal_id UUID;
BEGIN
  INSERT INTO withdrawals (
    user_id,
    amount,
    wallet_address,
    status,
    withdrawal_type
  ) VALUES (
    p_user_id,
    p_amount,
    p_wallet_address,
    'pending'::withdrawal_status,
    p_withdrawal_type::withdrawal_type_enum
  ) RETURNING id INTO v_withdrawal_id;
  
  RETURN v_withdrawal_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_withdrawal(UUID, DECIMAL, TEXT, TEXT) TO authenticated;

-- Create helper function to create transactions with proper type casting
CREATE OR REPLACE FUNCTION create_transaction(
  p_user_id UUID,
  p_type TEXT,
  p_amount DECIMAL,
  p_status TEXT,
  p_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    status,
    description
  ) VALUES (
    p_user_id,
    p_type::transaction_type,
    p_amount,
    p_status::transaction_status,
    p_description
  ) RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_transaction(UUID, TEXT, DECIMAL, TEXT, TEXT) TO authenticated;

-- Create helper function to create withdrawals with proper type casting
CREATE OR REPLACE FUNCTION create_withdrawal(
  p_user_id UUID,
  p_amount DECIMAL,
  p_wallet_address TEXT,
  p_withdrawal_type TEXT DEFAULT 'earnings'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_withdrawal_id UUID;
BEGIN
  INSERT INTO withdrawals (
    user_id,
    amount,
    wallet_address,
    status,
    withdrawal_type
  ) VALUES (
    p_user_id,
    p_amount,
    p_wallet_address,
    'pending'::withdrawal_status,
    p_withdrawal_type::withdrawal_type_enum
  ) RETURNING id INTO v_withdrawal_id;
  
  RETURN v_withdrawal_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_withdrawal(UUID, DECIMAL, TEXT, TEXT) TO authenticated;

-- Create helper function to create transactions with proper type casting
CREATE OR REPLACE FUNCTION create_transaction(
  p_user_id UUID,
  p_type TEXT,
  p_amount DECIMAL,
  p_status TEXT,
  p_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    status,
    description
  ) VALUES (
    p_user_id,
    p_type::transaction_type,
    p_amount,
    p_status::transaction_status,
    p_description
  ) RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_transaction(UUID, TEXT, DECIMAL, TEXT, TEXT) TO authenticated; 