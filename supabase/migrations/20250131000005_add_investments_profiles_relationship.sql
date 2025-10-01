-- Add foreign key relationship between investments and profiles tables
-- This migration adds a foreign key constraint to link investments.user_id to profiles.user_id

-- First, let's check if the relationship already exists and drop it if it does
DO $$ 
BEGIN
    -- Check if the foreign key constraint already exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'investments_profiles_user_id_fkey'
        AND table_name = 'investments'
    ) THEN
        ALTER TABLE public.investments 
        DROP CONSTRAINT investments_profiles_user_id_fkey;
    END IF;
END $$;

-- Add the foreign key constraint
ALTER TABLE public.investments 
ADD CONSTRAINT investments_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);

-- Update the RLS policies to ensure proper access control
DROP POLICY IF EXISTS "Users can view their own investments" ON public.investments;
DROP POLICY IF EXISTS "Users can insert their own investments" ON public.investments;
DROP POLICY IF EXISTS "Users can update their own investments" ON public.investments;

-- Recreate RLS policies
CREATE POLICY "Users can view their own investments" ON public.investments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own investments" ON public.investments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments" ON public.investments
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all investments" ON public.investments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update all investments" ON public.investments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );
