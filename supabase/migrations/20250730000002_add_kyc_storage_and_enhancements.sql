-- Add KYC storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kyc-documents', 'kyc-documents', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for KYC documents bucket
CREATE POLICY "KYC documents are viewable by authenticated admins" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kyc-documents' AND 
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN (
        SELECT email FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
      )
    )
  );

CREATE POLICY "Users can upload their own KYC documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'kyc-documents' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own KYC documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'kyc-documents' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add KYC fields to profiles table if they don't exist
DO $$ 
BEGIN
    -- Add date_of_birth column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'date_of_birth') THEN
        ALTER TABLE public.profiles ADD COLUMN date_of_birth DATE;
    END IF;

    -- Add kyc_verified_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_verified_at') THEN
        ALTER TABLE public.profiles ADD COLUMN kyc_verified_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add kyc_verified_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_verified_by') THEN
        ALTER TABLE public.profiles ADD COLUMN kyc_verified_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Create function to log KYC actions
CREATE OR REPLACE FUNCTION log_kyc_action(
  action_type TEXT,
  target_user_id UUID,
  details TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO admin_actions (
    admin_id,
    action_type,
    target_user_id,
    details,
    created_at
  ) VALUES (
    auth.uid(),
    action_type,
    target_user_id,
    details,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify KYC
CREATE OR REPLACE FUNCTION verify_kyc(user_id UUID, admin_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    kyc_status = 'verified',
    kyc_verified_at = NOW(),
    kyc_verified_by = admin_id,
    updated_at = NOW()
  WHERE user_id = verify_kyc.user_id;
  
  -- Log the action
  PERFORM log_kyc_action('kyc_verified', user_id, 'KYC verified by admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reject KYC
CREATE OR REPLACE FUNCTION reject_kyc(user_id UUID, admin_id UUID, reason TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    kyc_status = 'rejected',
    kyc_rejection_reason = reason,
    updated_at = NOW()
  WHERE user_id = reject_kyc.user_id;
  
  -- Log the action
  PERFORM log_kyc_action('kyc_rejected', user_id, 'KYC rejected: ' || reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for KYC queries
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON public.profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_submitted_at ON public.profiles(kyc_submitted_at);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_verified_at ON public.profiles(kyc_verified_at);

-- Update RLS policies for profiles to include KYC fields
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies for KYC management
CREATE POLICY "Admins can view all profiles for KYC" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN (
        SELECT email FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
      )
    )
  );

CREATE POLICY "Admins can update profiles for KYC" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN (
        SELECT email FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
      )
    )
  );

-- Add KYC status to user management view
CREATE OR REPLACE VIEW user_management_view AS
SELECT 
  p.user_id,
  p.email,
  p.full_name,
  p.username,
  p.kyc_status,
  p.kyc_verified_at,
  p.created_at,
  p.last_login,
  COALESCE(deposits.total_deposits, 0) as total_deposits,
  COALESCE(withdrawals.total_withdrawals, 0) as total_withdrawals,
  COALESCE(earnings.total_earnings, 0) as total_earnings
FROM public.profiles p
LEFT JOIN (
  SELECT user_id, SUM(amount) as total_deposits
  FROM public.deposits
  WHERE status = 'approved'
  GROUP BY user_id
) deposits ON p.user_id = deposits.user_id
LEFT JOIN (
  SELECT user_id, SUM(amount) as total_withdrawals
  FROM public.withdrawals
  WHERE status = 'completed'
  GROUP BY user_id
) withdrawals ON p.user_id = withdrawals.user_id
LEFT JOIN (
  SELECT user_id, SUM(amount) as total_earnings
  FROM public.earnings
  GROUP BY user_id
) earnings ON p.user_id = earnings.user_id; 