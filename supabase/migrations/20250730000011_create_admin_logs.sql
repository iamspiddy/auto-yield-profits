-- Migration: Create Admin Activity Logs Table
-- This migration creates the admin activity logs table for tracking all admin actions

-- Create admin logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'deposit_approval', 'deposit_rejection', 
      'withdrawal_processing', 'withdrawal_rejection',
      'kyc_verification', 'kyc_rejection',
      'profit_distribution', 'user_management',
      'system_config', 'security_event'
    )
  ),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_table TEXT,
  target_record_id TEXT,
  amount DECIMAL(20,8),
  currency TEXT DEFAULT 'USD',
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_user_id ON admin_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);

-- Enable RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view logs
CREATE POLICY "Only admins can view admin logs" ON admin_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can insert logs
CREATE POLICY "Only admins can insert admin logs" ON admin_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  _action_type TEXT,
  _target_user_id UUID DEFAULT NULL,
  _target_table TEXT DEFAULT NULL,
  _target_record_id TEXT DEFAULT NULL,
  _amount DECIMAL DEFAULT NULL,
  _currency TEXT DEFAULT 'USD',
  _description TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
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
    metadata
  ) VALUES (
    auth.uid(),
    _action_type,
    _target_user_id,
    _target_table,
    _target_record_id,
    _amount,
    _currency,
    _description,
    _metadata
  ) RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_admin_action(TEXT, UUID, TEXT, TEXT, DECIMAL, TEXT, TEXT, JSONB) TO authenticated;

-- Create function to get admin logs with filters
CREATE OR REPLACE FUNCTION get_admin_logs(
  _limit INTEGER DEFAULT 50,
  _offset INTEGER DEFAULT 0,
  _action_type TEXT DEFAULT NULL,
  _admin_id UUID DEFAULT NULL,
  _start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  _end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  admin_id UUID,
  admin_email TEXT,
  admin_name TEXT,
  action_type TEXT,
  target_user_id UUID,
  target_user_email TEXT,
  target_user_name TEXT,
  amount DECIMAL,
  currency TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.admin_id,
    admin_user.email as admin_email,
    admin_user.raw_user_meta_data->>'full_name' as admin_name,
    al.action_type,
    al.target_user_id,
    target_user.email as target_user_email,
    target_user.raw_user_meta_data->>'full_name' as target_user_name,
    al.amount,
    al.currency,
    al.description,
    al.created_at
  FROM admin_logs al
  LEFT JOIN auth.users admin_user ON al.admin_id = admin_user.id
  LEFT JOIN auth.users target_user ON al.target_user_id = target_user.id
  WHERE (_action_type IS NULL OR al.action_type = _action_type)
    AND (_admin_id IS NULL OR al.admin_id = _admin_id)
    AND (_start_date IS NULL OR al.created_at >= _start_date)
    AND (_end_date IS NULL OR al.created_at <= _end_date)
  ORDER BY al.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_admin_logs(INTEGER, INTEGER, TEXT, UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Create function to get admin logs summary
CREATE OR REPLACE FUNCTION get_admin_logs_summary(
  _days INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  _result JSON;
BEGIN
  SELECT json_build_object(
    'total_actions', (SELECT COUNT(*) FROM admin_logs WHERE created_at >= NOW() - INTERVAL '1 day' * _days),
    'actions_by_type', (
      SELECT json_object_agg(action_type, count)
      FROM (
        SELECT action_type, COUNT(*) as count
        FROM admin_logs
        WHERE created_at >= NOW() - INTERVAL '1 day' * _days
        GROUP BY action_type
      ) t
    ),
    'recent_actions', (
      SELECT json_agg(
        json_build_object(
          'action_type', action_type,
          'description', description,
          'created_at', created_at
        )
      )
      FROM (
        SELECT action_type, description, created_at
        FROM admin_logs
        ORDER BY created_at DESC
        LIMIT 10
      ) t
    )
  ) INTO _result;
  
  RETURN _result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_admin_logs_summary(INTEGER) TO authenticated; 