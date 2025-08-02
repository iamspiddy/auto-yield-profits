-- Create storage buckets for deposit proofs
-- This ensures the deposit-proofs bucket exists for storing proof files

-- Create deposit-proofs bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES 
('deposit-proofs', 'deposit-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES 
('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Storage policies for deposit proofs
CREATE POLICY "Users can upload their own deposit proofs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'deposit-proofs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own deposit proofs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'deposit-proofs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admin can view all deposit proofs
CREATE POLICY "Admins can view all deposit proofs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'deposit-proofs' AND
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Storage policies for avatars
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