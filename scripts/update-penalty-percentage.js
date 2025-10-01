import { supabase } from '../src/integrations/supabase/client.js';

async function updateEarlyWithdrawalPenalty() {
  try {
    console.log('Updating early withdrawal penalty from 10% to 50%...');
    
    // Update all investments with 10% penalty to 50%
    const { data, error } = await supabase
      .from('investments')
      .update({ early_withdrawal_penalty_percent: 50.00 })
      .eq('early_withdrawal_penalty_percent', 10.00)
      .select('id, user_id, early_withdrawal_penalty_percent');

    if (error) {
      console.error('Error updating penalty percentage:', error);
      return;
    }

    console.log(`Successfully updated ${data?.length || 0} investments to 50% penalty`);
    
    // Verify the update
    const { data: updatedInvestments, error: verifyError } = await supabase
      .from('investments')
      .select('id, user_id, early_withdrawal_penalty_percent, created_at')
      .eq('early_withdrawal_penalty_percent', 50.00)
      .order('created_at', { ascending: false })
      .limit(10);

    if (verifyError) {
      console.error('Error verifying update:', verifyError);
      return;
    }

    console.log('Updated investments:');
    console.table(updatedInvestments);
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

// Run the update
updateEarlyWithdrawalPenalty();
