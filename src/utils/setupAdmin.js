// Admin Setup Utility Script
// Run this in your browser console to set up admin users

// Import Supabase client (you'll need to adjust this based on your setup)
const { createClient } = window.supabase;

// Function to create an admin user
async function createAdminUser(email, password, fullName) {
  try {
    console.log('Creating admin user:', email);
    
    // Create user account
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }

    if (data.user) {
      // Add admin role using the database function
      const { data: roleData, error: roleError } = await supabase
        .rpc('add_admin_role', {
          _email: email
        });

      if (roleError) {
        console.error('Error setting admin role:', roleError);
        return { success: false, error: roleError.message };
      }

      console.log('Admin user created successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
      
      return { 
        success: true, 
        email: email, 
        password: password,
        user: data.user 
      };
    }

    return { success: false, error: 'Failed to create user' };
  } catch (error) {
    console.error('Error in createAdminUser:', error);
    return { success: false, error: error.message };
  }
}

// Function to add admin role to existing user
async function addAdminRole(email) {
  try {
    console.log('Adding admin role to:', email);
    
    const { data, error } = await supabase
      .rpc('add_admin_role', {
        _email: email
      });

    if (error) {
      console.error('Error adding admin role:', error);
      return { success: false, error: error.message };
    }

    console.log('Admin role added successfully!');
    return { success: true, data };
  } catch (error) {
    console.error('Error in addAdminRole:', error);
    return { success: false, error: error.message };
  }
}

// Function to remove admin role
async function removeAdminRole(email) {
  try {
    console.log('Removing admin role from:', email);
    
    const { data, error } = await supabase
      .rpc('remove_admin_role', {
        _email: email
      });

    if (error) {
      console.error('Error removing admin role:', error);
      return { success: false, error: error.message };
    }

    console.log('Admin role removed successfully!');
    return { success: true, data };
  } catch (error) {
    console.error('Error in removeAdminRole:', error);
    return { success: false, error: error.message };
  }
}

// Function to list all admin users
async function listAdminUsers() {
  try {
    console.log('Fetching admin users...');
    
    const { data, error } = await supabase
      .rpc('get_admin_users');

    if (error) {
      console.error('Error fetching admin users:', error);
      return { success: false, error: error.message };
    }

    console.log('Admin users:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error in listAdminUsers:', error);
    return { success: false, error: error.message };
  }
}

// Function to check if current user is admin
async function checkCurrentUserAdmin() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user logged in');
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

    console.log('Current user admin status:', data);
    return { success: true, isAdmin: data };
  } catch (error) {
    console.error('Error in checkCurrentUserAdmin:', error);
    return { success: false, error: error.message };
  }
}

// Function to test admin setup
async function testAdminSetup() {
  console.log('=== Testing Admin Setup ===');
  
  // Test 1: Check if current user is admin
  console.log('\n1. Checking current user admin status...');
  const adminCheck = await checkCurrentUserAdmin();
  console.log('Admin check result:', adminCheck);
  
  // Test 2: List admin users
  console.log('\n2. Listing admin users...');
  const adminList = await listAdminUsers();
  console.log('Admin list result:', adminList);
  
  // Test 3: Test admin role functions
  console.log('\n3. Testing admin role functions...');
  const testEmail = 'test@example.com';
  
  // Try to add admin role (this will fail if user doesn't exist, which is expected)
  const addRole = await addAdminRole(testEmail);
  console.log('Add role test result:', addRole);
  
  console.log('\n=== Admin Setup Test Complete ===');
}

// Export functions to global scope for console access
window.adminSetup = {
  createAdminUser,
  addAdminRole,
  removeAdminRole,
  listAdminUsers,
  checkCurrentUserAdmin,
  testAdminSetup
};

console.log('Admin setup utilities loaded!');
console.log('Available functions:');
console.log('- adminSetup.createAdminUser(email, password, fullName)');
console.log('- adminSetup.addAdminRole(email)');
console.log('- adminSetup.removeAdminRole(email)');
console.log('- adminSetup.listAdminUsers()');
console.log('- adminSetup.checkCurrentUserAdmin()');
console.log('- adminSetup.testAdminSetup()');

// Example usage:
console.log('\nExample usage:');
console.log('// Create a new admin user');
console.log('adminSetup.createAdminUser("admin@example.com", "securepassword123", "Admin User")');
console.log('\n// Add admin role to existing user');
console.log('adminSetup.addAdminRole("existing@example.com")');
console.log('\n// Test the setup');
console.log('adminSetup.testAdminSetup()'); 