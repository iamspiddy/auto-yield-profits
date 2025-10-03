-- Migration: Fix existing RLS policies for user_balances and balance_transactions
-- This migration drops and recreates policies to avoid conflicts

-- Drop existing policies for user_balances
DROP POLICY IF EXISTS "Users can view their own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Users can update their own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Users can insert their own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Admins can view all user balances" ON public.user_balances;
DROP POLICY IF EXISTS "Admins can update all user balances" ON public.user_balances;
DROP POLICY IF EXISTS "Admins can insert user balances" ON public.user_balances;

-- Drop existing policies for balance_transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Admins can view all balance transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Admins can insert balance transactions" ON public.balance_transactions;

-- Recreate user policies for user_balances
CREATE POLICY "Users can view their own balance" ON public.user_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance" ON public.user_balances
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balance" ON public.user_balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recreate user policies for balance_transactions
CREATE POLICY "Users can view their own transactions" ON public.balance_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON public.balance_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add admin policies for user_balances table
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

-- Add admin policies for balance_transactions table
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
