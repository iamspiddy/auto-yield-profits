// Test script to verify balance authentication is working
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://kyephqjmrprtylvuqmef.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZXBocWptcnBydHlsdnVxbWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzAyNjQsImV4cCI6MjA2OTMwNjI2NH0.0Hef7vRX_CXzUF2aHwzSs7XKGE6k3sL9KRU9n6mcPnQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testBalanceAuth() {
  console.log('🧪 Testing balance authentication...');
  
  try {
    // Test 1: Check if we can access user_balances table without authentication
    console.log('Test 1: Accessing user_balances without auth...');
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .limit(1);
    
    if (balanceError) {
      console.log('✅ Expected error (RLS working):', balanceError.message);
    } else {
      console.log('❌ Unexpected success - RLS might not be working');
    }
    
    // Test 2: Check if we can access with a test user session
    console.log('\nTest 2: Testing with session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log('ℹ️ No active session found (expected if not logged in)');
      console.log('Session error:', sessionError?.message || 'No session');
    } else {
      console.log('✅ Active session found for user:', session.user.id);
      
      // Try to access user_balances with session
      const { data: userBalanceData, error: userBalanceError } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (userBalanceError) {
        console.log('❌ Error accessing user balance:', userBalanceError.message);
      } else {
        console.log('✅ Successfully accessed user balance data');
        console.log('Balance data:', userBalanceData);
      }
    }
    
    // Test 3: Check RLS policies
    console.log('\nTest 3: Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'user_balances' });
    
    if (policiesError) {
      console.log('ℹ️ Could not check policies (function might not exist)');
    } else {
      console.log('✅ RLS policies:', policies);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBalanceAuth().then(() => {
  console.log('\n🏁 Balance authentication test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
