-- Add missing columns to profiles table for enhanced profile features
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_submitted' CHECK (kyc_status IN ('not_submitted', 'pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS kyc_id_url TEXT,
ADD COLUMN IF NOT EXISTS kyc_selfie_url TEXT,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create referral_earnings table for tracking referral commissions
CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(20, 8) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USDT',
  source_type TEXT NOT NULL DEFAULT 'deposit', -- 'deposit', 'withdrawal', etc.
  source_id UUID, -- Reference to the source transaction
  status transaction_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES 
('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies for avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own avatars" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Enable RLS on referral_earnings table
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_earnings
CREATE POLICY "Users can view their own referral earnings" ON public.referral_earnings
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view earnings where they were referred" ON public.referral_earnings
  FOR SELECT USING (auth.uid() = referred_user_id);

-- Add trigger for referral_earnings updated_at
CREATE TRIGGER update_referral_earnings_updated_at
  BEFORE UPDATE ON public.referral_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate referral commission on deposit approval
CREATE OR REPLACE FUNCTION public.calculate_referral_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_id UUID;
  commission_amount DECIMAL(20, 8);
BEGIN
  -- Only process when deposit is approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Find the referrer for this user
    SELECT referred_by INTO referrer_id
    FROM public.profiles
    WHERE user_id = NEW.user_id;
    
    -- If user has a referrer, calculate and create commission
    IF referrer_id IS NOT NULL THEN
      -- Calculate 5% commission
      commission_amount := NEW.amount * 0.05;
      
      -- Insert referral earnings record
      INSERT INTO public.referral_earnings (
        referrer_id,
        referred_user_id,
        amount,
        source_type,
        source_id,
        status
      ) VALUES (
        referrer_id,
        NEW.user_id,
        commission_amount,
        'deposit',
        NEW.id,
        'pending'
      );
      
      -- Create transaction record for the referrer
      INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        status,
        description
      ) VALUES (
        referrer_id,
        'referral_bonus',
        commission_amount,
        'pending',
        'Referral commission from ' || NEW.user_id::text
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for referral commission calculation
DROP TRIGGER IF EXISTS on_deposit_approved ON public.deposits;
CREATE TRIGGER on_deposit_approved
  AFTER UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.calculate_referral_commission();

-- Function to update last login timestamp
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = NOW()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for updating last login
DROP TRIGGER IF EXISTS on_user_login ON auth.users;
CREATE TRIGGER on_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.update_last_login();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON public.profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON public.referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referred ON public.referral_earnings(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- Add function to get user's total referral earnings
CREATE OR REPLACE FUNCTION public.get_user_referral_earnings(user_uuid UUID)
RETURNS DECIMAL(20, 8)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.referral_earnings
  WHERE referrer_id = user_uuid AND status = 'completed'
$$;

-- Add function to get user's pending referral earnings
CREATE OR REPLACE FUNCTION public.get_user_pending_referral_earnings(user_uuid UUID)
RETURNS DECIMAL(20, 8)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.referral_earnings
  WHERE referrer_id = user_uuid AND status = 'pending'
$$;

-- Add function to get user's total referrals count
CREATE OR REPLACE FUNCTION public.get_user_total_referrals(user_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM public.referrals
  WHERE referrer_id = user_uuid
$$;

-- Add function to get user's active referrals count
CREATE OR REPLACE FUNCTION public.get_user_active_referrals(user_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM public.referrals r
  JOIN public.profiles p ON r.referred_id = p.user_id
  WHERE r.referrer_id = user_uuid AND p.kyc_verified = true
$$;

-- Update the handle_new_user function to include new profile fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  referrer_user_id UUID;
BEGIN
  -- Insert profile with new fields
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email,
    username,
    kyc_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NULL),
    'not_submitted'
  );
  
  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Handle referral if referral_code was provided
  IF NEW.raw_user_meta_data ->> 'referral_code' IS NOT NULL THEN
    -- Find the referrer
    SELECT user_id INTO referrer_user_id
    FROM public.profiles
    WHERE referral_code = NEW.raw_user_meta_data ->> 'referral_code';
    
    IF referrer_user_id IS NOT NULL THEN
      -- Update the new user's profile with referrer
      UPDATE public.profiles
      SET referred_by = referrer_user_id
      WHERE user_id = NEW.id;
      
      -- Create referral relationship
      INSERT INTO public.referrals (referrer_id, referred_id)
      VALUES (referrer_user_id, NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add RLS policies for profile updates
CREATE POLICY "Users can update their own profile fields" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Add RLS policies for viewing referral earnings
CREATE POLICY "Admins can view all referral earnings" ON public.referral_earnings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add function to approve referral earnings (for admin use)
CREATE OR REPLACE FUNCTION public.approve_referral_earnings(earning_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Update referral earnings status
  UPDATE public.referral_earnings
  SET status = 'completed', updated_at = NOW()
  WHERE id = earning_id AND status = 'pending';
  
  -- Update corresponding transaction
  UPDATE public.transactions
  SET status = 'completed'
  WHERE reference_id = earning_id AND type = 'referral_bonus';
  
  RETURN TRUE;
END;
$$; 