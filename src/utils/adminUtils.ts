import { supabase } from '@/integrations/supabase/client';

/**
 * Check if a user has admin role
 * @param userId - The user ID to check
 * @returns Promise<boolean> - True if user is admin, false otherwise
 */
export const checkAdminRole = async (userId: string): Promise<boolean> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error checking admin role:', error);
      return false;
    }

    return profile?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
};

/**
 * Get admin users list
 * @returns Promise<Array> - List of admin users
 */
export const getAdminUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, role, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
};

/**
 * Promote a user to admin role
 * @param userId - The user ID to promote
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export const promoteToAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    return false;
  }
};

/**
 * Demote an admin user to regular user
 * @param userId - The user ID to demote
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export const demoteFromAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'user' })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error demoting admin user:', error);
    return false;
  }
}; 