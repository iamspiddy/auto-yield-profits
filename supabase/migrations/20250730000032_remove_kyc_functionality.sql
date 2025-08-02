-- Remove KYC functionality entirely from the application
-- Drop KYC-related columns from profiles table

-- Remove KYC columns if they exist
DO $$ 
BEGIN
    -- Drop kyc_verified column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_verified') THEN
        ALTER TABLE public.profiles DROP COLUMN kyc_verified;
    END IF;
    
    -- Drop kyc_status column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_status') THEN
        ALTER TABLE public.profiles DROP COLUMN kyc_status;
    END IF;
    
    -- Drop kyc_submitted_at column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_submitted_at') THEN
        ALTER TABLE public.profiles DROP COLUMN kyc_submitted_at;
    END IF;
    
    -- Drop kyc_rejection_reason column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_rejection_reason') THEN
        ALTER TABLE public.profiles DROP COLUMN kyc_rejection_reason;
    END IF;
    
    -- Drop kyc_id_url column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_id_url') THEN
        ALTER TABLE public.profiles DROP COLUMN kyc_id_url;
    END IF;
    
    -- Drop kyc_selfie_url column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_selfie_url') THEN
        ALTER TABLE public.profiles DROP COLUMN kyc_selfie_url;
    END IF;
END $$;

-- Drop KYC-related indexes if they exist
DROP INDEX IF EXISTS idx_profiles_kyc_status;
DROP INDEX IF EXISTS idx_profiles_kyc_verified;
DROP INDEX IF EXISTS idx_profiles_kyc_submitted_at;

-- Drop KYC storage bucket if it exists
DELETE FROM storage.buckets WHERE id = 'kyc-documents';

-- Drop KYC storage policies
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;

-- Update the handle_new_user function to be simpler without KYC
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  referrer_user_id UUID;
BEGIN
  -- Insert profile with only essential fields
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
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