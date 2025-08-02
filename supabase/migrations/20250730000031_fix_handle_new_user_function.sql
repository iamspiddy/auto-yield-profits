-- Fix the handle_new_user function to only insert existing columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  referrer_user_id UUID;
BEGIN
  -- Insert profile with only the columns that exist
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email,
    kyc_verified
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    FALSE
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