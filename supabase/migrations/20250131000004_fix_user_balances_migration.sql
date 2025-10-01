-- Fix User Balances Migration
-- This migration ensures that user_balances table is properly populated for existing users
-- and handles cases where the initial migration might have missed some data

-- First, let's update existing user balances with the correct calculations
UPDATE public.user_balances 
SET 
  available_balance = COALESCE((
    SELECT SUM(d.amount) 
    FROM public.deposits d 
    WHERE d.user_id = user_balances.user_id AND d.status = 'approved'
  ), 0) - COALESCE((
    SELECT SUM(w.amount) 
    FROM public.withdrawals w 
    WHERE w.user_id = user_balances.user_id AND w.status = 'completed' AND w.withdrawal_type = 'wallet'
  ), 0),
  invested_balance = COALESCE((
    SELECT SUM(i.invested_amount) 
    FROM public.investments i 
    WHERE i.user_id = user_balances.user_id AND i.status = 'active'
  ), 0),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = user_balances.user_id
);

-- Insert missing user balances for users who don't have a record yet
INSERT INTO public.user_balances (user_id, available_balance, invested_balance)
SELECT 
  u.id,
  COALESCE((
    SELECT SUM(d.amount) 
    FROM public.deposits d 
    WHERE d.user_id = u.id AND d.status = 'approved'
  ), 0) - COALESCE((
    SELECT SUM(w.amount) 
    FROM public.withdrawals w 
    WHERE w.user_id = u.id AND w.status = 'completed' AND w.withdrawal_type = 'wallet'
  ), 0) as available_balance,
  COALESCE((
    SELECT SUM(i.invested_amount) 
    FROM public.investments i 
    WHERE i.user_id = u.id AND i.status = 'active'
  ), 0) as invested_balance
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_balances ub WHERE ub.user_id = u.id
);

-- Create a function to recalculate user balance (useful for manual fixes)
CREATE OR REPLACE FUNCTION recalculate_user_balance(target_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  available_balance DECIMAL(20, 8),
  invested_balance DECIMAL(20, 8),
  total_balance DECIMAL(20, 8)
) AS $$
BEGIN
  -- Calculate the correct balances
  RETURN QUERY
  SELECT 
    target_user_id,
    COALESCE((
      SELECT SUM(d.amount) 
      FROM public.deposits d 
      WHERE d.user_id = target_user_id AND d.status = 'approved'
    ), 0) - COALESCE((
      SELECT SUM(w.amount) 
      FROM public.withdrawals w 
      WHERE w.user_id = target_user_id AND w.status = 'completed' AND w.withdrawal_type = 'wallet'
    ), 0) as available_balance,
    COALESCE((
      SELECT SUM(i.invested_amount) 
      FROM public.investments i 
      WHERE i.user_id = target_user_id AND i.status = 'active'
    ), 0) as invested_balance,
    (COALESCE((
      SELECT SUM(d.amount) 
      FROM public.deposits d 
      WHERE d.user_id = target_user_id AND d.status = 'approved'
    ), 0) - COALESCE((
      SELECT SUM(w.amount) 
      FROM public.withdrawals w 
      WHERE w.user_id = target_user_id AND w.status = 'completed' AND w.withdrawal_type = 'wallet'
    ), 0)) + COALESCE((
      SELECT SUM(i.invested_amount) 
      FROM public.investments i 
      WHERE i.user_id = target_user_id AND i.status = 'active'
    ), 0) as total_balance;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION recalculate_user_balance(UUID) TO authenticated;

-- Create a function to fix all user balances (admin function)
CREATE OR REPLACE FUNCTION fix_all_user_balances()
RETURNS TABLE(
  user_id UUID,
  old_available_balance DECIMAL(20, 8),
  new_available_balance DECIMAL(20, 8),
  old_invested_balance DECIMAL(20, 8),
  new_invested_balance DECIMAL(20, 8),
  updated BOOLEAN
) AS $$
DECLARE
  user_record RECORD;
  calculated_available DECIMAL(20, 8);
  calculated_invested DECIMAL(20, 8);
  old_available DECIMAL(20, 8);
  old_invested DECIMAL(20, 8);
  was_updated BOOLEAN := FALSE;
BEGIN
  -- Loop through all users
  FOR user_record IN 
    SELECT u.id FROM auth.users u
  LOOP
    -- Get current balances
    SELECT available_balance, invested_balance 
    INTO old_available, old_invested
    FROM public.user_balances 
    WHERE user_id = user_record.id;
    
    -- Calculate correct balances
    SELECT 
      COALESCE((
        SELECT SUM(d.amount) 
        FROM public.deposits d 
        WHERE d.user_id = user_record.id AND d.status = 'approved'
      ), 0) - COALESCE((
        SELECT SUM(w.amount) 
        FROM public.withdrawals w 
        WHERE w.user_id = user_record.id AND w.status = 'completed' AND w.withdrawal_type = 'wallet'
      ), 0),
      COALESCE((
        SELECT SUM(i.invested_amount) 
        FROM public.investments i 
        WHERE i.user_id = user_record.id AND i.status = 'active'
      ), 0)
    INTO calculated_available, calculated_invested;
    
    -- Update if different
    IF old_available IS DISTINCT FROM calculated_available OR old_invested IS DISTINCT FROM calculated_invested THEN
      UPDATE public.user_balances 
      SET 
        available_balance = calculated_available,
        invested_balance = calculated_invested,
        updated_at = NOW()
      WHERE user_id = user_record.id;
      was_updated := TRUE;
    END IF;
    
    -- Return the result
    RETURN QUERY SELECT 
      user_record.id,
      COALESCE(old_available, 0),
      calculated_available,
      COALESCE(old_invested, 0),
      calculated_invested,
      was_updated;
      
    was_updated := FALSE;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service role only (admin function)
GRANT EXECUTE ON FUNCTION fix_all_user_balances() TO service_role;
