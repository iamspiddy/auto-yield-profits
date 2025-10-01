// Script to fix user balance issues
// This script will recalculate and fix user balances for users who have investments but incorrect balances

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUserBalance(userId) {
  if (!userId) {
    console.error('Please provide a user ID');
    console.log('Usage: node fix-user-balance.js <user-id>');
    process.exit(1);
  }

  console.log(`Fixing balance for user: ${userId}`);
  console.log('='.repeat(50));

  try {
    // Get current user balance
    const { data: currentBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (balanceError && balanceError.code !== 'PGRST116') {
      console.error('Error fetching current balance:', balanceError);
      return;
    }

    console.log('Current balance record:');
    if (currentBalance) {
      console.log(`  Available: $${Number(currentBalance.available_balance).toFixed(2)}`);
      console.log(`  Invested: $${Number(currentBalance.invested_balance).toFixed(2)}`);
    } else {
      console.log('  No balance record found');
    }

    // Fetch approved deposits
    const { data: deposits } = await supabase
      .from('deposits')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'approved');

    // Fetch completed wallet withdrawals
    const { data: completedWalletWithdrawals } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .eq('withdrawal_type', 'wallet');

    // Fetch active investments
    const { data: investments } = await supabase
      .from('investments')
      .select('invested_amount, total_profit_earned, status')
      .eq('user_id', userId)
      .eq('status', 'active');

    // Calculate correct balances
    const totalDeposits = deposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
    const totalCompletedWalletWithdrawals = completedWalletWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
    const correctAvailableBalance = totalDeposits - totalCompletedWalletWithdrawals;
    const correctInvestedBalance = investments?.reduce((sum, inv) => sum + Number(inv.invested_amount), 0) || 0;
    const totalProfitEarned = investments?.reduce((sum, inv) => sum + Number(inv.total_profit_earned), 0) || 0;

    console.log('\nCalculated correct balances:');
    console.log(`  Total Deposits: $${totalDeposits.toFixed(2)}`);
    console.log(`  Completed Wallet Withdrawals: $${totalCompletedWalletWithdrawals.toFixed(2)}`);
    console.log(`  Correct Available Balance: $${correctAvailableBalance.toFixed(2)}`);
    console.log(`  Correct Invested Balance: $${correctInvestedBalance.toFixed(2)}`);
    console.log(`  Total Profit Earned: $${totalProfitEarned.toFixed(2)}`);
    console.log(`  Active Investments: ${investments?.length || 0}`);

    // Check if balances need fixing
    const currentAvailable = currentBalance?.available_balance || 0;
    const currentInvested = currentBalance?.invested_balance || 0;
    
    const availableNeedsFix = Math.abs(correctAvailableBalance - Number(currentAvailable)) > 0.01;
    const investedNeedsFix = Math.abs(correctInvestedBalance - Number(currentInvested)) > 0.01;

    if (!availableNeedsFix && !investedNeedsFix) {
      console.log('\n✅ Balances are already correct! No fix needed.');
      return;
    }

    console.log('\n⚠️  Balance mismatch detected!');
    console.log(`Available balance needs fix: ${availableNeedsFix ? 'Yes' : 'No'}`);
    console.log(`Invested balance needs fix: ${investedNeedsFix ? 'Yes' : 'No'}`);

    // Update the user balance
    const { error: updateError } = await supabase
      .from('user_balances')
      .upsert({
        user_id: userId,
        available_balance: correctAvailableBalance,
        invested_balance: correctInvestedBalance,
        updated_at: new Date().toISOString()
      });

    if (updateError) {
      console.error('Error updating user balance:', updateError);
      return;
    }

    console.log('\n✅ Balance has been fixed!');
    console.log(`Updated available balance: $${correctAvailableBalance.toFixed(2)}`);
    console.log(`Updated invested balance: $${correctInvestedBalance.toFixed(2)}`);

    // Create a transaction record for the balance correction
    const { error: transactionError } = await supabase
      .from('balance_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'admin_adjustment',
        amount: 0, // No net change, just correction
        balance_before: Number(currentAvailable),
        balance_after: correctAvailableBalance,
        reference_id: null,
        description: 'Balance correction - fixed investment deduction issue'
      });

    if (transactionError) {
      console.warn('Failed to create transaction record:', transactionError);
    } else {
      console.log('✅ Transaction record created for balance correction');
    }

  } catch (error) {
    console.error('Error fixing user balance:', error);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];
fixUserBalance(userId);
