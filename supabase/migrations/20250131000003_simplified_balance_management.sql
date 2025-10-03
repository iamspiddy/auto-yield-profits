-- Simplified Balance Management Migration
-- This migration creates the balance management tables without complex RPC functions

-- Create user_balances table for detailed balance tracking
CREATE TABLE IF NOT EXISTS public.user_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  available_balance DECIMAL(20, 8) DEFAULT 0 CHECK (available_balance >= 0),
  invested_balance DECIMAL(20, 8) DEFAULT 0 CHECK (invested_balance >= 0),
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

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_user_balances_updated_at 
  BEFORE UPDATE ON public.user_balances 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize user balances for existing users based on their deposits and investments
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
