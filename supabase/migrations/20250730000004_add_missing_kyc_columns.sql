-- Add missing KYC columns to profiles table
DO $$ 
BEGIN
    -- Add kyc_submitted_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_submitted_at') THEN
        ALTER TABLE public.profiles ADD COLUMN kyc_submitted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add kyc_rejection_reason column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_rejection_reason') THEN
        ALTER TABLE public.profiles ADD COLUMN kyc_rejection_reason TEXT;
    END IF;

    -- Add kyc_id_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_id_url') THEN
        ALTER TABLE public.profiles ADD COLUMN kyc_id_url TEXT;
    END IF;

    -- Add kyc_selfie_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_selfie_url') THEN
        ALTER TABLE public.profiles ADD COLUMN kyc_selfie_url TEXT;
    END IF;

    -- Add kyc_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kyc_status') THEN
        ALTER TABLE public.profiles ADD COLUMN kyc_status TEXT DEFAULT 'not_submitted';
    END IF;
END $$;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_submitted_at ON public.profiles(kyc_submitted_at);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON public.profiles(kyc_status);

-- Update any existing profiles to have the default KYC status
UPDATE public.profiles 
SET kyc_status = 'not_submitted' 
WHERE kyc_status IS NULL; 