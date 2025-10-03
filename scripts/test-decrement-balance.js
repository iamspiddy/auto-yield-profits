// Test script to verify decrement_balance function works
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://kyephqjmrprtylvuqmef.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZXBocWptcnBydHlsdnVxbWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzAyNjQsImV4cCI6MjA2OTMwNjI2NH0.0Hef7vRX_CXzUF2aHwzSs7XKGE6k3sL9KRU9n6mcPnQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testDecrementBalance() {
  console.log('🧪 Testing decrement_balance function...');
  
  try {
    // Test 1: Check if function exists
    console.log('Test 1: Checking if decrement_balance function exists...');
    
    // Try to call the function with a test user ID
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID for testing
    const testAmount = 10;
    
    const { data, error } = await supabase
      .rpc('decrement_balance', {
        user_id_param: testUserId,
        amount_param: testAmount
      });
    
    if (error) {
      if (error.code === 'PGRST202') {
        console.log('❌ Function not found - migration needs to be applied');
        console.log('Error details:', error.message);
        console.log('\nTo fix this:');
        console.log('1. Run: npx supabase db push');
        console.log('2. Or manually apply the migration: supabase/migrations/20250131000005_add_decrement_balance_function.sql');
      } else if (error.message.includes('Insufficient balance')) {
        console.log('✅ Function exists and works correctly (insufficient balance error is expected)');
        console.log('Error details:', error.message);
      } else {
        console.log('❌ Unexpected error:', error);
      }
    } else {
      console.log('✅ Function exists and returned:', data);
    }
    
    // Test 2: Check if increment_balance function exists (for comparison)
    console.log('\nTest 2: Checking if increment_balance function exists...');
    const { data: incData, error: incError } = await supabase
      .rpc('increment_balance', {
        user_id_param: testUserId,
        amount_param: testAmount
      });
    
    if (incError) {
      console.log('❌ increment_balance function error:', incError.message);
    } else {
      console.log('✅ increment_balance function works:', incData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDecrementBalance().then(() => {
  console.log('\n🏁 Decrement balance function test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
