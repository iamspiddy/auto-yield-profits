import { supabase } from '@/integrations/supabase/client';

export const testSupabaseConnection = async () => {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Basic connection successful');
    
    // Test 2: Check if admin functions exist
    console.log('2. Testing admin functions...');
    const { data: hasRoleData, error: hasRoleError } = await supabase
      .rpc('has_role', {
        _user_id: '00000000-0000-0000-0000-000000000000', // Dummy ID
        _role: 'admin'
      });
    
    if (hasRoleError) {
      console.error('❌ Admin functions not found:', hasRoleError);
      console.log('💡 Make sure you ran the database migrations!');
      return { success: false, error: 'Admin functions not found. Run migrations first.' };
    }
    
    console.log('✅ Admin functions working');
    
    // Test 3: Check if tables exist
    console.log('3. Testing table existence...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ Profiles table not accessible:', profilesError);
      return { success: false, error: 'Profiles table not accessible' };
    }
    
    console.log('✅ Tables accessible');
    
    // Test 4: Check user_roles table
    console.log('4. Testing user_roles table...');
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('id')
      .limit(1);
    
    if (rolesError) {
      console.error('❌ User_roles table not found:', rolesError);
      console.log('💡 Run the admin roles migration!');
      return { success: false, error: 'User_roles table not found. Run migrations.' };
    }
    
    console.log('✅ User_roles table exists');
    
    console.log('🎉 All connection tests passed!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return { success: false, error: error.message };
  }
};

export const checkDatabaseSetup = async () => {
  console.log('🔍 Checking database setup...');
  
  const checks = [
    { name: 'profiles table', query: 'SELECT 1 FROM profiles LIMIT 1' },
    { name: 'user_roles table', query: 'SELECT 1 FROM user_roles LIMIT 1' },
    { name: 'has_role function', query: 'SELECT has_role(\'00000000-0000-0000-0000-000000000000\', \'admin\')' },
    { name: 'add_admin_role function', query: 'SELECT add_admin_role(\'test@example.com\')' },
    { name: 'kyc_documents table', query: 'SELECT 1 FROM kyc_documents LIMIT 1' },
    { name: 'admin_logs table', query: 'SELECT 1 FROM admin_logs LIMIT 1' }
  ];
  
  for (const check of checks) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: check.query });
      if (error) {
        console.log(`❌ ${check.name}: ${error.message}`);
      } else {
        console.log(`✅ ${check.name}: OK`);
      }
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`);
    }
  }
};

// Add this to window for console access
if (typeof window !== 'undefined') {
  (window as any).testConnection = testSupabaseConnection;
  (window as any).checkDatabase = checkDatabaseSetup;
} 