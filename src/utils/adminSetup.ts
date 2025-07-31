import { supabase } from '@/integrations/supabase/client';

// Function to add admin role to current user
export async function addAdminRoleToCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No user logged in');
    }

    console.log('Adding admin role to user:', user.email);

    // Try the RPC function first
    const { data, error } = await supabase
      .rpc('add_admin_role', {
        _user_id: user.id
      });

    if (error) {
      console.error('RPC function failed, trying direct insertion:', error);
      
      // Fallback: Direct insertion into user_roles table
      const { error: directError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin'
        });

      if (directError) {
        console.error('Direct insertion also failed:', directError);
        throw directError;
      }
      
      console.log('Admin role added via direct insertion!');
    } else {
      console.log('Admin role added successfully via RPC!');
    }

    return { success: true, user: user.email };
  } catch (error) {
    console.error('Error in addAdminRoleToCurrentUser:', error);
    return { success: false, error: error.message };
  }
}

// Function to check if current user is admin
export async function checkCurrentUserAdmin() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, isAdmin: false };
    }

    const { data, error } = await supabase
      .rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

    if (error) {
      console.error('Error checking admin role:', error);
      return { success: false, error: error.message };
    }

    return { success: true, isAdmin: data };
  } catch (error) {
    console.error('Error in checkCurrentUserAdmin:', error);
    return { success: false, error: error.message };
  }
}

// Function to list all admin users
export async function listAdminUsers() {
  try {
    // Try the RPC function first
    const { data, error } = await supabase
      .rpc('get_admin_users');

    if (error) {
      console.error('RPC function failed, trying direct query:', error);
      
      // Fallback: Direct query to user_roles table
      const { data: directData, error: directError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(email)
        `)
        .eq('role', 'admin');

      if (directError) {
        console.error('Direct query also failed:', directError);
        return { success: false, error: directError.message };
      }

      // Transform the data to match the expected format
      const transformedData = directData?.map(item => ({
        user_id: item.user_id,
        email: item.profiles?.email
      })).filter(item => item.email) || [];

      return { success: true, data: transformedData };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in listAdminUsers:', error);
    return { success: false, error: error.message };
  }
}

// Debug function to check user_roles table directly
export async function debugUserRoles() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }

    // Check user_roles table directly
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id);

    // Check profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id);

    // Check all admin users in user_roles
    const { data: allAdminRoles, error: allAdminError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('role', 'admin');

    return {
      success: true,
      currentUser: user,
      userRoles: userRoles,
      profile: profile,
      allAdminRoles: allAdminRoles,
      errors: {
        userRoles: userRolesError,
        profile: profileError,
        allAdmin: allAdminError
      }
    };
  } catch (error) {
    console.error('Error in debugUserRoles:', error);
    return { success: false, error: error.message };
  }
}

// Function to remove admin role from current user
export async function removeAdminRoleFromCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No user logged in');
    }

    const { data, error } = await supabase
      .rpc('remove_admin_role', {
        _user_id: user.id
      });

    if (error) {
      console.error('Error removing admin role:', error);
      throw error;
    }

    console.log('Admin role removed successfully!');
    return { success: true, user: user.email };
  } catch (error) {
    console.error('Error in removeAdminRoleFromCurrentUser:', error);
    return { success: false, error: error.message };
  }
} 