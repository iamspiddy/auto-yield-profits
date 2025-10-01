// Script to fix balance issues for all users
// This script will recalculate and fix user balances for all users who have investments

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAllUserBalances() {
  console.log('Starting balance fix for all users...');
  console.log('='.repeat(50));

  try {
    // Get all users who have investments
    const { data: usersWithInvestments, error: usersError } = await supabase
      .from('investments')
      .select('user_id')
      .eq('status', 'active');

    if (usersError) {
      console.error('Error fetching users with investments:', usersError);
      return;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(usersWithInvestments?.map(inv => inv.user_id) || [])];
    
    console.log(`Found ${uniqueUserIds.length} users with active investments`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const userId of uniqueUserIds) {
      try {
        console.log(`\nProcessing user: ${userId}`);
        
        // Get current user balance
        const { data: currentBalance } = await supabase
          .from('user_balances')
          .select('*')
          .eq('user_id', userId)
          .single();

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

        // Check if balances need fixing
        const currentAvailable = currentBalance?.available_balance || 0;
        const currentInvested = currentBalance?.invested_balance || 0;
        
        const availableNeedsFix = Math.abs(correctAvailableBalance - Number(currentAvailable)) > 0.01;
        const investedNeedsFix = Math.abs(correctInvestedBalance - Number(currentInvested)) > 0.01;

        if (!availableNeedsFix && !investedNeedsFix) {
          console.log('  ✅ Balances are correct');
          continue;
        }

        console.log('  ⚠️  Balance mismatch detected, fixing...');
        console.log(`    Available: $${Number(currentAvailable).toFixed(2)} → $${correctAvailableBalance.toFixed(2)}`);
        console.log(`    Invested: $${Number(currentInvested).toFixed(2)} → $${correctInvestedBalance.toFixed(2)}`);

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
          console.error(`  ❌ Error updating balance:`, updateError);
          errorCount++;
          continue;
        }

        // Create a transaction record for the balance correction
        await supabase
          .from('balance_transactions')
          .insert({
            user_id: userId,
            transaction_type: 'admin_adjustment',
            amount: 0,
            balance_before: Number(currentAvailable),
            balance_after: correctAvailableBalance,
            reference_id: null,
            description: 'Balance correction - fixed investment deduction issue'
          });

        console.log('  ✅ Balance fixed');
        fixedCount++;

      } catch (userError) {
        console.error(`  ❌ Error processing user ${userId}:`, userError);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Balance fix completed!');
    console.log(`✅ Fixed: ${fixedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📊 Total processed: ${uniqueUserIds.length} users`);

  } catch (error) {
    console.error('Error in fixAllUserBalances:', error);
  }
}

// Run the fix
fixAllUserBalances();
