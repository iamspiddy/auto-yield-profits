// Test script to verify balance calculation fix
// This script can be run to test if the balance calculation is working correctly

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBalanceCalculation() {
  try {
    console.log('Testing balance calculation...');
    
    // Get a test user (you can modify this to test with a specific user)
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('No users found to test with');
      return;
    }
    
    const testUserId = users[0].id;
    console.log(`Testing with user: ${testUserId}`);
    
    // Test the old calculation method (fallback)
    console.log('\n--- Testing Fallback Calculation ---');
    
    // Fetch approved deposits
    const { data: deposits } = await supabase
      .from('deposits')
      .select('amount')
      .eq('user_id', testUserId)
      .eq('status', 'approved');
    
    // Fetch completed wallet withdrawals
    const { data: completedWalletWithdrawals } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', testUserId)
      .eq('status', 'completed')
      .eq('withdrawal_type', 'wallet');
    
    // Fetch active investments
    const { data: investments } = await supabase
      .from('investments')
      .select('invested_amount, total_profit_earned, status')
      .eq('user_id', testUserId)
      .eq('status', 'active');
    
    const totalDeposits = deposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
    const totalCompletedWalletWithdrawals = completedWalletWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
    const availableBalance = totalDeposits - totalCompletedWalletWithdrawals;
    const investedBalance = investments?.reduce((sum, inv) => sum + Number(inv.invested_amount), 0) || 0;
    const totalProfitEarned = investments?.reduce((sum, inv) => sum + Number(inv.total_profit_earned), 0) || 0;
    
    console.log('Fallback Calculation Results:');
    console.log(`  Total Deposits: $${totalDeposits.toFixed(2)}`);
    console.log(`  Completed Wallet Withdrawals: $${totalCompletedWalletWithdrawals.toFixed(2)}`);
    console.log(`  Available Balance: $${availableBalance.toFixed(2)}`);
    console.log(`  Invested Balance: $${investedBalance.toFixed(2)}`);
    console.log(`  Total Profit Earned: $${totalProfitEarned.toFixed(2)}`);
    console.log(`  Active Investments: ${investments?.length || 0}`);
    
    // Test the new balance system
    console.log('\n--- Testing New Balance System ---');
    
    const { data: userBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', testUserId)
      .single();
    
    if (balanceError && balanceError.code !== 'PGRST116') {
      console.error('Error fetching user balance:', balanceError);
    } else if (userBalance) {
      console.log('New Balance System Results:');
      console.log(`  Available Balance: $${Number(userBalance.available_balance).toFixed(2)}`);
      console.log(`  Invested Balance: $${Number(userBalance.invested_balance).toFixed(2)}`);
      console.log(`  Total Balance: $${(Number(userBalance.available_balance) + Number(userBalance.invested_balance)).toFixed(2)}`);
      console.log(`  Last Updated: ${userBalance.updated_at}`);
      
      // Compare the results
      console.log('\n--- Comparison ---');
      const availableMatch = Math.abs(availableBalance - Number(userBalance.available_balance)) < 0.01;
      const investedMatch = Math.abs(investedBalance - Number(userBalance.invested_balance)) < 0.01;
      
      console.log(`Available Balance Match: ${availableMatch ? '✅' : '❌'}`);
      console.log(`Invested Balance Match: ${investedMatch ? '✅' : '❌'}`);
      
      if (!availableMatch || !investedMatch) {
        console.log('\n⚠️  Balance mismatch detected! The migration may need to be run.');
        console.log('Run the migration script to fix user balances.');
      } else {
        console.log('\n✅ Balance calculation is working correctly!');
      }
    } else {
      console.log('No user balance record found. The user may need to be migrated.');
    }
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testBalanceCalculation();
