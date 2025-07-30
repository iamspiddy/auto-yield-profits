-- Fix the email constraint issue in profiles table
-- Make email nullable or provide a default value

-- Option 1: Make email nullable (if you want to allow profiles without email)
-- ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- Option 2: Provide a default value (recommended)
-- This ensures email is always populated from auth.users
ALTER TABLE public.profiles 
ALTER COLUMN email SET DEFAULT '';

-- Update existing profiles that might have NULL email
UPDATE public.profiles 
SET email = auth.users.email 
FROM auth.users 
WHERE profiles.user_id = auth.users.id 
AND profiles.email IS NULL;

-- Then make it NOT NULL again
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL; 