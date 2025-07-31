-- Migration: Add withdrawal PIN system
-- This allows admins to generate 4-digit PINs for user withdrawals

-- Create withdrawal_pins table
CREATE TABLE IF NOT EXISTS public.withdrawal_pins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pin TEXT NOT NULL CHECK (pin ~ '^[0-9]{4}$'),
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.withdrawal_pins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for withdrawal_pins
CREATE POLICY "Users can view own pins" ON public.withdrawal_pins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert pins" ON public.withdrawal_pins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN (
        SELECT email FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Admins can update pins" ON public.withdrawal_pins
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN (
        SELECT email FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_pins_user_id ON public.withdrawal_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_pins_expires_at ON public.withdrawal_pins(expires_at);
CREATE INDEX IF NOT EXISTS idx_withdrawal_pins_is_used ON public.withdrawal_pins(is_used);

-- Function to generate withdrawal PIN (admin only)
CREATE OR REPLACE FUNCTION generate_withdrawal_pin(
  _user_id UUID,
  _expires_in_hours INTEGER DEFAULT 24
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _pin TEXT;
  _expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email IN (
      SELECT email FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Only admins can generate withdrawal PINs';
  END IF;

  -- Generate random 4-digit PIN
  _pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  _expires_at := NOW() + (_expires_in_hours || ' hours')::INTERVAL;

  -- Insert PIN record
  INSERT INTO public.withdrawal_pins (
    user_id,
    pin,
    expires_at,
    created_by
  ) VALUES (
    _user_id,
    _pin,
    _expires_at,
    auth.uid()
  );

  RETURN _pin;
END;
$$;

-- Function to verify withdrawal PIN
CREATE OR REPLACE FUNCTION verify_withdrawal_pin(
  _user_id UUID,
  _pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _pin_record RECORD;
BEGIN
  -- Find valid PIN for user
  SELECT * INTO _pin_record
  FROM public.withdrawal_pins
  WHERE user_id = _user_id 
    AND pin = _pin
    AND is_used = FALSE
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no valid PIN found, return false
  IF _pin_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Mark PIN as used
  UPDATE public.withdrawal_pins
  SET is_used = TRUE
  WHERE id = _pin_record.id;

  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_withdrawal_pin(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_withdrawal_pin(UUID, TEXT) TO authenticated; 