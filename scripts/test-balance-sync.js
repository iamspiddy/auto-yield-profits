// Test script to verify balance sync between admin updates and dashboard display
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBalanceSync() {
  console.log('Testing balance sync between admin updates and dashboard...\n');

  try {
    // Test 1: Check if user_balances table exists and has data
    console.log('1. Checking user_balances table...');
    const { data: userBalances, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .limit(5);

    if (balanceError) {
      console.error('Error fetching user_balances:', balanceError);
    } else {
      console.log(`Found ${userBalances?.length || 0} user balance records`);
      if (userBalances && userBalances.length > 0) {
        console.log('Sample user balance:', userBalances[0]);
      }
    }

    // Test 2: Check if increment_balance function exists
    console.log('\n2. Testing increment_balance function...');
    const testUserId = '5f21fd1d-3224-4963-b32d-c8177aa829f7'; // Use the user ID from the logs
    
    try {
      const { data: result, error: incrementError } = await supabase
        .rpc('increment_balance', {
          user_id_param: testUserId,
          amount_param: 100
        });

      if (incrementError) {
        console.error('Error calling increment_balance:', incrementError);
      } else {
        console.log('increment_balance result:', result);
      }
    } catch (error) {
      console.error('Error testing increment_balance function:', error);
    }

    // Test 3: Check if the updated balance appears in user_balances
    console.log('\n3. Checking updated balance in user_balances...');
    const { data: updatedBalance, error: updatedError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    if (updatedError) {
      console.error('Error fetching updated balance:', updatedError);
    } else {
      console.log('Updated balance record:', updatedBalance);
    }

    // Test 4: Check balance transactions
    console.log('\n4. Checking balance transactions...');
    const { data: transactions, error: transactionError } = await supabase
      .from('balance_transactions')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (transactionError) {
      console.error('Error fetching transactions:', transactionError);
    } else {
      console.log(`Found ${transactions?.length || 0} transactions for user`);
      if (transactions && transactions.length > 0) {
        console.log('Latest transaction:', transactions[0]);
      }
    }

    console.log('\n✅ Balance sync test completed!');
    console.log('\nNext steps:');
    console.log('1. Run the migrations: npx supabase db reset');
    console.log('2. Test admin balance updates in the admin panel');
    console.log('3. Check if the updates appear in the user dashboard');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testBalanceSync();
