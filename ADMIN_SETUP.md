# Admin Authentication Setup Guide

This guide explains how to set up secure admin authentication for the AutoYield application.

## Overview

The admin system implements role-based access control (RBAC) with the following features:

- **Secure Admin Login**: `/admin/login` - Admin-only login page
- **Role-Based Access**: Only users with `role: 'admin'` can access admin routes
- **Route Protection**: All `/admin/*` routes are protected by `AdminGuard`
- **Session Management**: Secure session handling with automatic logout
- **Database Security**: Row Level Security (RLS) policies for admin data

## Database Setup

### 1. Run the Migration

Execute the following SQL in your Supabase SQL Editor:

```sql
-- Add role column to profiles table for RBAC
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = is_admin.user_id 
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policy for admin-only access
CREATE POLICY "Admins can view all data" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO anon;
```

### 2. Create Admin Users

#### Option A: Via Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Users**
3. Click **"Add User"**
4. Enter admin email and password
5. After creating the user, go to **Table Editor > profiles**
6. Find the user's profile and update `role` to `'admin'`

#### Option B: Via SQL

```sql
-- First, create the user in Supabase Auth
-- Then update their profile role
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id = 'USER_UUID_HERE';
```

#### Option C: Via Application (for existing users)

1. Log in as an existing admin
2. Go to **Admin Dashboard > Users Management**
3. Find the user you want to promote
4. Use the "Promote to Admin" action

## Application Routes

### Admin Routes

- `/admin/login` - Admin login page
- `/admin/dashboard` - Admin dashboard (protected)
- `/admin/users` - User management (protected)
- `/admin/deposits` - Deposit management (protected)
- `/admin/withdrawals` - Withdrawal management (protected)
- `/admin/profits` - Profit distribution (protected)
- `/admin/referrals` - Referral management (protected)
- `/admin/kyc` - KYC management (protected)
- `/admin/activity` - Activity log (protected)

### Regular User Routes

- `/` - Landing page
- `/auth` - User login/signup
- `/dashboard` - User dashboard
- `/deposit` - Deposit funds
- `/withdraw` - Withdraw funds
- `/history` - Transaction history
- `/referrals` - Referral program
- `/profile` - User profile
- `/kyc` - KYC verification

## Security Features

### 1. Role-Based Access Control

- Users must have `role: 'admin'` in their profile to access admin routes
- Non-admin users are automatically redirected to `/admin/login`
- Admin status is checked on every route access

### 2. Session Security

- Admin sessions are managed securely through Supabase Auth
- Automatic logout on session expiration
- Redirect to admin login after logout

### 3. Route Protection

- All admin routes are wrapped with `AdminGuard`
- Guards check both authentication and admin role
- Graceful error handling for unauthorized access

### 4. Database Security

- Row Level Security (RLS) policies protect admin data
- Admin functions are marked as `SECURITY DEFINER`
- Proper indexing for role-based queries

## Admin Login Flow

1. **Access**: Navigate to `/admin/login`
2. **Authentication**: Enter admin email and password
3. **Role Check**: System verifies user has `role: 'admin'`
4. **Access Denied**: Non-admin users are signed out and shown error
5. **Success**: Admin users are redirected to `/admin/dashboard`

## Error Handling

### Common Error Scenarios

1. **Invalid Credentials**: Shows "Login failed" message
2. **Non-Admin User**: Shows "Access denied" with user info
3. **Network Error**: Shows "Failed to verify admin status"
4. **Session Expired**: Redirects to login page

### Error Messages

- `"Access denied. Admin privileges required."` - Non-admin user
- `"Failed to verify admin status"` - Database error
- `"Login failed. Please check your credentials."` - Invalid credentials

## Production Considerations

### 1. Environment Variables

Ensure these are set in production:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Security Headers

Add security headers to your hosting platform:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

### 3. Rate Limiting

Consider implementing rate limiting on `/admin/login` to prevent brute force attacks.

### 4. Monitoring

Monitor admin login attempts and failed authentication events.

## Troubleshooting

### Issue: Admin can't log in

**Solution:**
1. Check if user exists in Supabase Auth
2. Verify `role: 'admin'` in profiles table
3. Check browser console for errors
4. Verify Supabase connection

### Issue: Non-admin can access admin routes

**Solution:**
1. Check `AdminGuard` component
2. Verify RLS policies are active
3. Check role column in profiles table
4. Clear browser cache and cookies

### Issue: Admin login page not loading

**Solution:**
1. Check route configuration in `App.tsx`
2. Verify `AdminLogin` component exists
3. Check for TypeScript compilation errors
4. Verify all dependencies are installed

## Support

For issues with admin authentication:

1. Check the browser console for errors
2. Verify database migrations are applied
3. Test with a known admin account
4. Check Supabase logs for authentication events

## Security Best Practices

1. **Regular Password Updates**: Encourage admins to use strong passwords
2. **Two-Factor Authentication**: Consider implementing 2FA for admin accounts
3. **Session Timeout**: Implement automatic session timeout
4. **Audit Logging**: Log all admin actions for security auditing
5. **Backup Access**: Maintain backup admin accounts
6. **Regular Reviews**: Periodically review admin user list 