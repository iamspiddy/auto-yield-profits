// Debug script to check user balance data
// Run this to see what data exists for a specific user

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUserBalance(userId) {
  if (!userId) {
    console.error('Please provide a user ID');
    console.log('Usage: node debug-user-balance.js <user-id>');
    process.exit(1);
  }

  console.log(`Debugging balance for user: ${userId}`);
  console.log('='.repeat(50));

  try {
    // Check user_balances table
    console.log('\n1. Checking user_balances table:');
    const { data: userBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (balanceError && balanceError.code !== 'PGRST116') {
      console.error('Error fetching user balance:', balanceError);
    } else if (userBalance) {
      console.log('✅ User balance found:');
      console.log(`  Available: $${Number(userBalance.available_balance).toFixed(2)}`);
      console.log(`  Invested: $${Number(userBalance.invested_balance).toFixed(2)}`);
      console.log(`  Updated: ${userBalance.updated_at}`);
    } else {
      console.log('❌ No user balance record found');
    }

    // Check deposits
    console.log('\n2. Checking deposits:');
    const { data: deposits, error: depositsError } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', userId);
    
    if (depositsError) {
      console.error('Error fetching deposits:', depositsError);
    } else {
      console.log(`Found ${deposits?.length || 0} deposits:`);
      if (deposits && deposits.length > 0) {
        const approvedDeposits = deposits.filter(d => d.status === 'approved');
        const totalApproved = approvedDeposits.reduce((sum, d) => sum + Number(d.amount), 0);
        console.log(`  Approved deposits: ${approvedDeposits.length}, Total: $${totalApproved.toFixed(2)}`);
        
        deposits.forEach((deposit, index) => {
          console.log(`    ${index + 1}. $${Number(deposit.amount).toFixed(2)} - ${deposit.status} (${deposit.created_at})`);
        });
      }
    }

    // Check withdrawals
    console.log('\n3. Checking withdrawals:');
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', userId);
    
    if (withdrawalsError) {
      console.error('Error fetching withdrawals:', withdrawalsError);
    } else {
      console.log(`Found ${withdrawals?.length || 0} withdrawals:`);
      if (withdrawals && withdrawals.length > 0) {
        const completedWallet = withdrawals.filter(w => w.status === 'completed' && w.withdrawal_type === 'wallet');
        const totalCompleted = completedWallet.reduce((sum, w) => sum + Number(w.amount), 0);
        console.log(`  Completed wallet withdrawals: ${completedWallet.length}, Total: $${totalCompleted.toFixed(2)}`);
        
        withdrawals.forEach((withdrawal, index) => {
          console.log(`    ${index + 1}. $${Number(withdrawal.amount).toFixed(2)} - ${withdrawal.status} (${withdrawal.withdrawal_type}) - ${withdrawal.created_at}`);
        });
      }
    }

    // Check investments
    console.log('\n4. Checking investments:');
    const { data: investments, error: investmentsError } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId);
    
    if (investmentsError) {
      console.error('Error fetching investments:', investmentsError);
    } else {
      console.log(`Found ${investments?.length || 0} investments:`);
      if (investments && investments.length > 0) {
        const activeInvestments = investments.filter(i => i.status === 'active');
        const totalInvested = activeInvestments.reduce((sum, i) => sum + Number(i.invested_amount), 0);
        const totalProfit = activeInvestments.reduce((sum, i) => sum + Number(i.total_profit_earned), 0);
        console.log(`  Active investments: ${activeInvestments.length}, Total invested: $${totalInvested.toFixed(2)}, Total profit: $${totalProfit.toFixed(2)}`);
        
        investments.forEach((investment, index) => {
          console.log(`    ${index + 1}. $${Number(investment.invested_amount).toFixed(2)} - ${investment.status} - ${investment.created_at}`);
        });
      }
    }

    // Check earnings
    console.log('\n5. Checking earnings:');
    const { data: earnings, error: earningsError } = await supabase
      .from('earnings')
      .select('*')
      .eq('user_id', userId);
    
    if (earningsError) {
      console.error('Error fetching earnings:', earningsError);
    } else {
      console.log(`Found ${earnings?.length || 0} earnings:`);
      if (earnings && earnings.length > 0) {
        const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
        console.log(`  Total earnings: $${totalEarnings.toFixed(2)}`);
        
        earnings.forEach((earning, index) => {
          console.log(`    ${index + 1}. $${Number(earning.amount).toFixed(2)} - ${earning.created_at}`);
        });
      }
    }

    // Calculate expected balance
    console.log('\n6. Expected balance calculation:');
    const totalDeposits = deposits?.filter(d => d.status === 'approved').reduce((sum, d) => sum + Number(d.amount), 0) || 0;
    const totalCompletedWithdrawals = withdrawals?.filter(w => w.status === 'completed' && w.withdrawal_type === 'wallet').reduce((sum, w) => sum + Number(w.amount), 0) || 0;
    const expectedAvailable = totalDeposits - totalCompletedWithdrawals;
    const expectedInvested = investments?.filter(i => i.status === 'active').reduce((sum, i) => sum + Number(i.invested_amount), 0) || 0;
    
    console.log(`  Expected available balance: $${expectedAvailable.toFixed(2)}`);
    console.log(`  Expected invested balance: $${expectedInvested.toFixed(2)}`);
    console.log(`  Expected total balance: $${(expectedAvailable + expectedInvested).toFixed(2)}`);

  } catch (error) {
    console.error('Error in debug:', error);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];
debugUserBalance(userId);
