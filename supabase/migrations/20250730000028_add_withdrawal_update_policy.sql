-- Add UPDATE policy for withdrawals so admins can mark withdrawals as paid
-- Allow admins to update any withdrawal
CREATE POLICY "Admins can update withdrawals" ON public.withdrawals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow users to update their own withdrawals (for status changes)
CREATE POLICY "Users can update own withdrawals" ON public.withdrawals
  FOR UPDATE USING (auth.uid() = user_id); 