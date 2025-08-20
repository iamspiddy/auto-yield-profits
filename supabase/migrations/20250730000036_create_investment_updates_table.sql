-- Migration: Create investment_updates table for tracking investment changes
-- This table tracks when admins increase or decrease user investment amounts

-- Create investment_updates table
CREATE TABLE IF NOT EXISTS public.investment_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('increase', 'decrease')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_investment_updates_user_id ON public.investment_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_updates_created_at ON public.investment_updates(created_at);

-- Enable RLS on investment_updates table
ALTER TABLE public.investment_updates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for investment_updates
-- Admins can view all investment updates
CREATE POLICY "Admins can view all investment updates" ON public.investment_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admins can create investment updates
CREATE POLICY "Admins can create investment updates" ON public.investment_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Users can view their own investment updates
CREATE POLICY "Users can view their own investment updates" ON public.investment_updates
  FOR SELECT USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON public.investment_updates TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
