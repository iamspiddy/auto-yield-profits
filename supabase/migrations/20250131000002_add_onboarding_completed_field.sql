-- Add onboarding_completed field to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Update existing profiles to mark onboarding as completed if they have investments
UPDATE profiles 
SET onboarding_completed = TRUE 
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM investments 
  WHERE user_id IS NOT NULL
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed 
ON profiles(onboarding_completed);
