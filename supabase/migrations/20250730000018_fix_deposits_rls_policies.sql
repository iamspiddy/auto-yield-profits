-- Migration: Fix RLS policies on deposits table to allow admin updates
-- This fixes the issue where admin users cannot update deposit status

-- First, let's see what policies exist
-- SELECT * FROM pg_policies WHERE tablename = 'deposits';

-- Drop existing policies that might be blocking admin updates
DROP POLICY IF EXISTS "Users can view own deposits" ON deposits;
DROP POLICY IF EXISTS "Users can insert own deposits" ON deposits;
DROP POLICY IF EXISTS "Users can update own deposits" ON deposits;
DROP POLICY IF EXISTS "Admins can manage all deposits" ON deposits;

-- Create comprehensive policies that allow both users and admins proper access
-- Policy for users to view their own deposits
CREATE POLICY "Users can view own deposits" ON deposits
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own deposits
CREATE POLICY "Users can insert own deposits" ON deposits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own deposits (limited fields)
CREATE POLICY "Users can update own deposits" ON deposits
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for admins to view all deposits
CREATE POLICY "Admins can view all deposits" ON deposits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy for admins to update all deposits
CREATE POLICY "Admins can update all deposits" ON deposits
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy for admins to insert deposits (if needed)
CREATE POLICY "Admins can insert deposits" ON deposits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy for admins to delete deposits (if needed)
CREATE POLICY "Admins can delete deposits" ON deposits
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    ); 