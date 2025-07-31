-- Fix generate_withdrawal_pin function to check admin role in user_roles table
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
  -- Check if caller is admin (using user_roles table)
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_withdrawal_pin(UUID, INTEGER) TO authenticated; 