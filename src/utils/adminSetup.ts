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
    const { data, error } = await supabase
      .rpc('get_admin_users');

    if (error) {
      console.error('Error fetching admin users:', error);
      return { success: false, error: error.message };
    }

    return { success: true, admins: data };
  } catch (error) {
    console.error('Error in listAdminUsers:', error);
    return { success: false, error: error.message };
  }
}

// Function to create a new admin user securely
export async function createAdminUser(email: string, password: string, fullName: string) {
  try {
    console.log('Creating new admin user:', email);

    // First, create the user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'admin'
        }
      }
    });

    if (authError) {
      console.error('Error creating user account:', authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user account' };
    }

    // Add admin role to the user
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'admin'
      });

    if (roleError) {
      console.error('Error adding admin role:', roleError);
      // Try to clean up the created user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: roleError.message };
    }

    console.log('Admin user created successfully:', email);
    return { 
      success: true, 
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: fullName
      }
    };
  } catch (error) {
    console.error('Error in createAdminUser:', error);
    return { success: false, error: error.message };
  }
}

// Function to remove admin role from a user
export async function removeAdminRole(userId: string) {
  try {
    console.log('Removing admin role from user:', userId);

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'admin');

    if (error) {
      console.error('Error removing admin role:', error);
      return { success: false, error: error.message };
    }

    console.log('Admin role removed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in removeAdminRole:', error);
    return { success: false, error: error.message };
  }
}

// Function to verify admin setup is working
export async function verifyAdminSetup() {
  try {
    console.log('Verifying admin setup...');

    // Check if user_roles table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('user_roles')
      .select('count')
      .limit(1);

    if (tableError) {
      return { 
        success: false, 
        error: 'user_roles table not found or not accessible',
        details: tableError.message 
      };
    }

    // Check if has_role function exists
    const { data: functionCheck, error: functionError } = await supabase
      .rpc('has_role', {
        _user_id: '00000000-0000-0000-0000-000000000000',
        _role: 'admin'
      });

    if (functionError && !functionError.message.includes('not found')) {
      return { 
        success: false, 
        error: 'has_role function not working properly',
        details: functionError.message 
      };
    }

    console.log('Admin setup verification completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in verifyAdminSetup:', error);
    return { success: false, error: error.message };
  }
} 