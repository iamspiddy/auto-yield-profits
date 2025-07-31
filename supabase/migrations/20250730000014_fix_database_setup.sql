-- Migration: Fix Database Setup Based on Actual Structure
-- This migration fixes the database setup to match your actual tables

-- 1. First, let's check if user_roles table exists and fix it
DO $$ 
BEGIN
    -- Create user_roles table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        CREATE TABLE user_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Disable RLS on user_roles to prevent infinite recursion
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- 3. Drop any problematic policies
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to view user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow service role to manage user_roles" ON user_roles;

-- 4. Create simple policies for user_roles
CREATE POLICY "Allow all authenticated users to view user_roles" ON user_roles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role to manage user_roles" ON user_roles
    FOR ALL USING (auth.role() = 'service_role');

-- 5. Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Create or replace the has_role function
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = _user_id AND role = _role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION has_role(UUID, TEXT) TO authenticated;

-- 8. Create helper functions for admin management
CREATE OR REPLACE FUNCTION add_admin_role(_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_roles (user_id, role) 
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION remove_admin_role(_user_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM user_roles 
    WHERE user_id = _user_id AND role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE(user_id UUID, email TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT ur.user_id, p.email
    FROM user_roles ur
    JOIN profiles p ON ur.user_id = p.user_id
    WHERE ur.role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant permissions for helper functions
GRANT EXECUTE ON FUNCTION add_admin_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_admin_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_users() TO authenticated;

-- 10. Create admin logs function if it doesn't exist
CREATE OR REPLACE FUNCTION log_admin_action(
    _action_type TEXT,
    _target_user_id UUID DEFAULT NULL,
    _target_table TEXT DEFAULT NULL,
    _target_record_id TEXT DEFAULT NULL,
    _amount NUMERIC DEFAULT NULL,
    _currency TEXT DEFAULT NULL,
    _description TEXT DEFAULT NULL,
    _metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    _log_id UUID;
BEGIN
    INSERT INTO admin_logs (
        admin_id,
        action_type,
        target_user_id,
        target_table,
        target_record_id,
        amount,
        currency,
        description,
        metadata,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        auth.uid(),
        _action_type,
        _target_user_id,
        _target_table,
        _target_record_id,
        _amount,
        _currency,
        _description,
        _metadata,
        inet_client_addr(),
        current_setting('request.headers')::json->>'user-agent',
        NOW()
    ) RETURNING id INTO _log_id;
    
    RETURN _log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant permissions for admin logs
GRANT EXECUTE ON FUNCTION log_admin_action(TEXT, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, JSONB) TO authenticated;

-- 12. Create function to get admin logs
CREATE OR REPLACE FUNCTION get_admin_logs(
    _limit INTEGER DEFAULT 50,
    _offset INTEGER DEFAULT 0,
    _action_type TEXT DEFAULT NULL,
    _admin_id UUID DEFAULT NULL,
    _target_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    admin_email TEXT,
    action_type TEXT,
    target_user_email TEXT,
    target_table TEXT,
    target_record_id TEXT,
    amount NUMERIC,
    currency TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        admin_p.email as admin_email,
        al.action_type,
        target_p.email as target_user_email,
        al.target_table,
        al.target_record_id,
        al.amount,
        al.currency,
        al.description,
        al.created_at
    FROM admin_logs al
    LEFT JOIN profiles admin_p ON al.admin_id = admin_p.user_id
    LEFT JOIN profiles target_p ON al.target_user_id = target_p.user_id
    WHERE (_action_type IS NULL OR al.action_type = _action_type)
        AND (_admin_id IS NULL OR al.admin_id = _admin_id)
        AND (_target_user_id IS NULL OR al.target_user_id = _target_user_id)
    ORDER BY al.created_at DESC
    LIMIT _limit OFFSET _offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Grant permissions for get_admin_logs
GRANT EXECUTE ON FUNCTION get_admin_logs(INTEGER, INTEGER, TEXT, UUID, UUID) TO authenticated;

-- 14. Create function to get user KYC status
CREATE OR REPLACE FUNCTION get_user_kyc_status(_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    kyc_verified BOOLEAN,
    kyc_status TEXT,
    kyc_submitted_at TIMESTAMP WITH TIME ZONE,
    documents_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.kyc_verified,
        p.kyc_status,
        p.kyc_submitted_at,
        COUNT(kd.id)::INTEGER as documents_count
    FROM profiles p
    LEFT JOIN kyc_documents kd ON p.user_id = kd.user_id
    WHERE p.user_id = _user_id
    GROUP BY p.user_id, p.kyc_verified, p.kyc_status, p.kyc_submitted_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Grant permissions for get_user_kyc_status
GRANT EXECUTE ON FUNCTION get_user_kyc_status(UUID) TO authenticated; 