-- Migration: Fix RLS Policies - Remove Infinite Recursion
-- This migration fixes the infinite recursion issue in user_roles RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;

-- Create simpler policies that don't cause infinite recursion
-- Policy: Allow all authenticated users to view user_roles (for admin checks)
CREATE POLICY "Allow authenticated users to view user_roles" ON user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Allow service role to manage roles (for admin setup)
CREATE POLICY "Allow service role to manage user_roles" ON user_roles
  FOR ALL USING (auth.role() = 'service_role');

-- For development, you can also disable RLS temporarily:
-- ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Create a simpler function to check admin role without causing recursion
CREATE OR REPLACE FUNCTION is_admin(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Use a direct query instead of the has_role function to avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- Update the has_role function to be simpler
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_role(UUID, app_role) TO authenticated; 