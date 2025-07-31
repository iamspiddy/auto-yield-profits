-- Fix get_admin_users function to handle users with multiple roles
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE(user_id UUID, email TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ur.user_id, p.email
    FROM user_roles ur
    JOIN profiles p ON ur.user_id = p.user_id
    WHERE ur.role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_admin_users() TO authenticated; 