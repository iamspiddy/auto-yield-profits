-- Add admin role to the current user for testing
-- This assumes the logged-in user should be an admin
-- You can modify the email address to match your test user

INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.user_id, 
  'admin'::app_role
FROM public.profiles p 
WHERE p.email = 'spiddyclipz@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.user_id AND ur.role = 'admin'
);