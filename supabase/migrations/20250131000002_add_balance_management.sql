-- Migration: Add balance management system
-- This migration adds user balance tracking and transaction management

-- Add balance field to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS available_balance DECIMAL(20, 8) DEFAULT 0 CHECK (available_balance >= 0);

-- Create user_balances table for detailed balance tracking
CREATE TABLE IF NOT EXISTS public.user_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  available_balance DECIMAL(20, 8) DEFAULT 0 CHECK (available_balance >= 0),
  invested_balance DECIMAL(20, 8) DEFAULT 0 CHECK (invested_balance >= 0),
  total_balance DECIMAL(20, 8) GENERATED ALWAYS AS (available_balance + invested_balance) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

-- Create balance_transactions table for detailed transaction history
CREATE TABLE IF NOT EXISTS public.balance_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'deposit', 'withdrawal', 'investment_deduction', 'investment_return', 
    'early_withdrawal', 'maturity_payout', 'referral_bonus', 'admin_adjustment'
  )),
  amount DECIMAL(20, 8) NOT NULL,
  balance_before DECIMAL(20, 8) NOT NULL,
  balance_after DECIMAL(20, 8) NOT NULL,
  reference_id UUID, -- References investment_id, deposit_id, withdrawal_id, etc.
  description TEXT,
  metadata JSONB, -- Additional transaction data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_balances (drop existing first)
DROP POLICY IF EXISTS "Users can view their own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Users can update their own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Users can insert their own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Admins can view all user balances" ON public.user_balances;
DROP POLICY IF EXISTS "Admins can update all user balances" ON public.user_balances;
DROP POLICY IF EXISTS "Admins can insert user balances" ON public.user_balances;

CREATE POLICY "Users can view their own balance" ON public.user_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance" ON public.user_balances
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balance" ON public.user_balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for balance_transactions (drop existing first)
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Admins can view all balance transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Admins can insert balance transactions" ON public.balance_transactions;

CREATE POLICY "Users can view their own transactions" ON public.balance_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON public.balance_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies for user_balances table
CREATE POLICY "Admins can view all user balances" ON public.user_balances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all user balances" ON public.user_balances
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert user balances" ON public.user_balances
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admin policies for balance_transactions table
CREATE POLICY "Admins can view all balance transactions" ON public.balance_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert balance transactions" ON public.balance_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_user_id ON public.balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_type ON public.balance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_created_at ON public.balance_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_reference_id ON public.balance_transactions(reference_id);

-- Create function to get user balance
CREATE OR REPLACE FUNCTION get_user_balance(user_uuid UUID)
RETURNS TABLE (
  available_balance DECIMAL(20, 8),
  invested_balance DECIMAL(20, 8),
  total_balance DECIMAL(20, 8)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ub.available_balance, 0) as available_balance,
    COALESCE(ub.invested_balance, 0) as invested_balance,
    COALESCE(ub.total_balance, 0) as total_balance
  FROM public.user_balances ub
  WHERE ub.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user balance
CREATE OR REPLACE FUNCTION update_user_balance(
  user_uuid UUID,
  amount_change DECIMAL(20, 8),
  transaction_type TEXT,
  reference_id UUID DEFAULT NULL,
  description TEXT DEFAULT NULL,
  metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance DECIMAL(20, 8);
  new_balance DECIMAL(20, 8);
  balance_field TEXT;
BEGIN
  -- Determine which balance field to update
  CASE transaction_type
    WHEN 'investment_deduction' THEN balance_field := 'available_balance';
    WHEN 'investment_return', 'maturity_payout', 'early_withdrawal' THEN balance_field := 'available_balance';
    WHEN 'deposit' THEN balance_field := 'available_balance';
    WHEN 'withdrawal' THEN balance_field := 'available_balance';
    ELSE balance_field := 'available_balance';
  END CASE;

  -- Get current balance
  SELECT COALESCE(available_balance, 0) INTO current_balance
  FROM public.user_balances
  WHERE user_id = user_uuid;

  -- Calculate new balance
  new_balance := current_balance + amount_change;

  -- Check if balance would go negative
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', current_balance, ABS(amount_change);
  END IF;

  -- Insert or update user balance
  INSERT INTO public.user_balances (user_id, available_balance, invested_balance)
  VALUES (user_uuid, 
    CASE WHEN balance_field = 'available_balance' THEN new_balance ELSE 0 END,
    CASE WHEN balance_field = 'invested_balance' THEN new_balance ELSE 0 END)
  ON CONFLICT (user_id) DO UPDATE SET
    available_balance = CASE 
      WHEN balance_field = 'available_balance' THEN new_balance 
      ELSE user_balances.available_balance 
    END,
    invested_balance = CASE 
      WHEN balance_field = 'invested_balance' THEN new_balance 
      ELSE user_balances.invested_balance 
    END,
    updated_at = NOW();

  -- Record transaction
  INSERT INTO public.balance_transactions (
    user_id, transaction_type, amount, balance_before, balance_after,
    reference_id, description, metadata
  ) VALUES (
    user_uuid, transaction_type, amount_change, current_balance, new_balance,
    reference_id, description, metadata
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process investment deduction
CREATE OR REPLACE FUNCTION process_investment_deduction(
  user_uuid UUID,
  investment_amount DECIMAL(20, 8),
  investment_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Deduct from available balance
  PERFORM update_user_balance(
    user_uuid,
    -investment_amount,
    'investment_deduction',
    investment_id,
    'Investment deduction for new investment'
  );

  -- Add to invested balance
  PERFORM update_user_balance(
    user_uuid,
    investment_amount,
    'investment_deduction',
    investment_id,
    'Investment amount added to invested balance'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process investment maturity
CREATE OR REPLACE FUNCTION process_investment_maturity(
  user_uuid UUID,
  maturity_amount DECIMAL(20, 8),
  investment_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Add maturity amount to available balance
  PERFORM update_user_balance(
    user_uuid,
    maturity_amount,
    'maturity_payout',
    investment_id,
    'Investment maturity payout'
  );

  -- Remove from invested balance (the original investment amount)
  -- Note: This should be called with the original invested amount, not the maturity amount
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process early withdrawal
CREATE OR REPLACE FUNCTION process_early_withdrawal(
  user_uuid UUID,
  withdrawal_amount DECIMAL(20, 8),
  penalty_amount DECIMAL(20, 8),
  investment_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Add withdrawal amount to available balance
  PERFORM update_user_balance(
    user_uuid,
    withdrawal_amount,
    'early_withdrawal',
    investment_id,
    'Early withdrawal with penalty applied'
  );

  -- Remove from invested balance (the original investment amount)
  -- Note: This should be called with the original invested amount
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_user_balances_updated_at 
  BEFORE UPDATE ON public.user_balances 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize user balances for existing users
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

-- Create function to get user balance summary
CREATE OR REPLACE FUNCTION get_user_balance_summary(user_uuid UUID)
RETURNS TABLE (
  available_balance DECIMAL(20, 8),
  invested_balance DECIMAL(20, 8),
  total_balance DECIMAL(20, 8),
  active_investments_count INTEGER,
  total_invested DECIMAL(20, 8),
  total_profit_earned DECIMAL(20, 8)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ub.available_balance, 0) as available_balance,
    COALESCE(ub.invested_balance, 0) as invested_balance,
    COALESCE(ub.total_balance, 0) as total_balance,
    COALESCE((
      SELECT COUNT(*)::INTEGER 
      FROM public.investments i 
      WHERE i.user_id = user_uuid AND i.status = 'active'
    ), 0) as active_investments_count,
    COALESCE((
      SELECT SUM(i.invested_amount) 
      FROM public.investments i 
      WHERE i.user_id = user_uuid AND i.status = 'active'
    ), 0) as total_invested,
    COALESCE((
      SELECT SUM(i.total_profit_earned) 
      FROM public.investments i 
      WHERE i.user_id = user_uuid AND i.status = 'active'
    ), 0) as total_profit_earned
  FROM public.user_balances ub
  WHERE ub.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
