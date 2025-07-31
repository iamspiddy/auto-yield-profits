-- Migration to remove all admin functionality from the database
-- This migration removes admin-related tables, policies, functions, and indexes

-- Drop admin-related RLS policies (only for existing tables)
DROP POLICY IF EXISTS "Admins can view all deposits" ON public.deposits;
DROP POLICY IF EXISTS "Admins can update deposits" ON public.deposits;
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Admins can update withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can view all earnings" ON public.earnings;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all data" ON public.profiles;

-- Drop storage policies
DROP POLICY IF EXISTS "KYC documents are viewable by authenticated admins" ON storage.objects;

-- Drop admin-related functions (only if they exist)
DROP FUNCTION IF EXISTS is_admin(UUID);
DROP FUNCTION IF EXISTS verify_kyc(UUID, UUID);

-- Drop admin-related indexes (only if they exist)
DROP INDEX IF EXISTS idx_admin_actions_admin_id;
DROP INDEX IF EXISTS idx_admin_actions_created_at;

-- Drop admin_actions table (only if it exists)
DROP TABLE IF EXISTS public.admin_actions;

-- Remove role column from profiles table (only if it exists)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Remove admin-related columns from other tables (only if they exist)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS kyc_verified_by;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS kyc_verified_at;

-- Remove admin-related triggers if they exist (only for existing tables)
DROP TRIGGER IF EXISTS log_kyc_verification ON public.profiles;

-- Revoke admin-related permissions (only if functions exist)
-- These will fail gracefully if the functions don't exist
DO $$
BEGIN
    -- Try to revoke permissions, but don't fail if functions don't exist
    BEGIN
        REVOKE EXECUTE ON FUNCTION is_admin(UUID) FROM authenticated;
    EXCEPTION WHEN OTHERS THEN
        -- Function doesn't exist, continue
    END;
    
    BEGIN
        REVOKE EXECUTE ON FUNCTION is_admin(UUID) FROM anon;
    EXCEPTION WHEN OTHERS THEN
        -- Function doesn't exist, continue
    END;
    
    BEGIN
        REVOKE EXECUTE ON FUNCTION verify_kyc(UUID, UUID) FROM authenticated;
    EXCEPTION WHEN OTHERS THEN
        -- Function doesn't exist, continue
    END;
    
    BEGIN
        REVOKE EXECUTE ON FUNCTION verify_kyc(UUID, UUID) FROM anon;
    EXCEPTION WHEN OTHERS THEN
        -- Function doesn't exist, continue
    END;
END $$;

-- Clean up any remaining admin-related metadata
-- This removes any admin role assignments from user metadata
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE raw_user_meta_data ? 'role'; 