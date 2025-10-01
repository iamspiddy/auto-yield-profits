import { supabase } from '@/integrations/supabase/client';
import { InvestmentService } from '@/lib/investmentService';
import { BalanceService } from '@/lib/balanceService';

export interface MaturityProcessingResult {
  processed: number;
  totalPayout: number;
  errors: string[];
}

/**
 * Process all matured investments automatically
 * This function should be called by a cron job or scheduled task
 */
export async function processMaturedInvestments(): Promise<MaturityProcessingResult> {
  const result: MaturityProcessingResult = {
    processed: 0,
    totalPayout: 0,
    errors: []
  };

  try {
    // Get all investments that are matured but still active
    const { data: maturedInvestments, error: fetchError } = await supabase
      .from('investments')
      .select(`
        *,
        plan:investment_plans(*)
      `)
      .eq('status', 'active')
      .eq('is_matured', true);

    if (fetchError) {
      throw new Error(`Failed to fetch matured investments: ${fetchError.message}`);
    }

    if (!maturedInvestments || maturedInvestments.length === 0) {
      console.log('No matured investments to process');
      return result;
    }

    console.log(`Processing ${maturedInvestments.length} matured investments`);

    // Process each matured investment
    for (const investment of maturedInvestments) {
      try {
        const maturityResult = await InvestmentService.processInvestmentMaturity(
          investment.id,
          investment.user_id
        );

        if (maturityResult.success) {
          result.processed++;
          result.totalPayout += maturityResult.maturityAmount;
          
          console.log(`Processed maturity for investment ${investment.id}: $${maturityResult.maturityAmount}`);
        } else {
          result.errors.push(`Failed to process investment ${investment.id}: Unknown error`);
        }
      } catch (error: any) {
        const errorMessage = `Failed to process investment ${investment.id}: ${error.message}`;
        result.errors.push(errorMessage);
        console.error(errorMessage);
      }
    }

    console.log(`Maturity processing completed: ${result.processed} investments processed, $${result.totalPayout} total payout`);
    
    return result;
  } catch (error: any) {
    const errorMessage = `Maturity processing failed: ${error.message}`;
    result.errors.push(errorMessage);
    console.error(errorMessage);
    return result;
  }
}

/**
 * Check for investments that should be marked as matured
 * This function updates the is_matured flag for investments past their maturity date
 */
export async function updateMaturityStatus(): Promise<{ updated: number; errors: string[] }> {
  const result = {
    updated: 0,
    errors: [] as string[]
  };

  try {
    // Get investments that are past their maturity date but not marked as matured
    const { data: investmentsToUpdate, error: fetchError } = await supabase
      .from('investments')
      .select('id, user_id, maturity_date, status')
      .eq('status', 'active')
      .eq('is_matured', false)
      .not('maturity_date', 'is', null)
      .lt('maturity_date', new Date().toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch investments for maturity update: ${fetchError.message}`);
    }

    if (!investmentsToUpdate || investmentsToUpdate.length === 0) {
      console.log('No investments need maturity status update');
      return result;
    }

    console.log(`Updating maturity status for ${investmentsToUpdate.length} investments`);

    // Update each investment's maturity status
    for (const investment of investmentsToUpdate) {
      try {
        const { error: updateError } = await supabase
          .from('investments')
          .update({ 
            is_matured: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', investment.id);

        if (updateError) {
          result.errors.push(`Failed to update maturity status for investment ${investment.id}: ${updateError.message}`);
        } else {
          result.updated++;
          console.log(`Updated maturity status for investment ${investment.id}`);
        }
      } catch (error: any) {
        result.errors.push(`Error updating investment ${investment.id}: ${error.message}`);
      }
    }

    console.log(`Maturity status update completed: ${result.updated} investments updated`);
    
    return result;
  } catch (error: any) {
    const errorMessage = `Maturity status update failed: ${error.message}`;
    result.errors.push(errorMessage);
    console.error(errorMessage);
    return result;
  }
}

/**
 * Complete maturity processing workflow
 * This function should be called by a cron job to handle the full maturity process
 */
export async function runMaturityWorkflow(): Promise<{
  statusUpdated: number;
  investmentsProcessed: number;
  totalPayout: number;
  errors: string[];
}> {
  console.log('Starting maturity workflow...');
  
  const workflowResult = {
    statusUpdated: 0,
    investmentsProcessed: 0,
    totalPayout: 0,
    errors: [] as string[]
  };

  try {
    // Step 1: Update maturity status for investments past their maturity date
    console.log('Step 1: Updating maturity status...');
    const statusResult = await updateMaturityStatus();
    workflowResult.statusUpdated = statusResult.updated;
    workflowResult.errors.push(...statusResult.errors);

    // Step 2: Process matured investments
    console.log('Step 2: Processing matured investments...');
    const processingResult = await processMaturedInvestments();
    workflowResult.investmentsProcessed = processingResult.processed;
    workflowResult.totalPayout = processingResult.totalPayout;
    workflowResult.errors.push(...processingResult.errors);

    console.log('Maturity workflow completed:', {
      statusUpdated: workflowResult.statusUpdated,
      investmentsProcessed: workflowResult.investmentsProcessed,
      totalPayout: workflowResult.totalPayout,
      errorCount: workflowResult.errors.length
    });

    return workflowResult;
  } catch (error: any) {
    const errorMessage = `Maturity workflow failed: ${error.message}`;
    workflowResult.errors.push(errorMessage);
    console.error(errorMessage);
    return workflowResult;
  }
}

/**
 * Get statistics about matured investments
 */
export async function getMaturityStats(): Promise<{
  totalMatured: number;
  totalPayout: number;
  pendingProcessing: number;
}> {
  try {
    // Get matured investments that haven't been processed yet
    const { data: maturedInvestments, error: maturedError } = await supabase
      .from('investments')
      .select('current_balance, status')
      .eq('is_matured', true)
      .eq('status', 'active');

    if (maturedError) {
      throw new Error(`Failed to fetch matured investments: ${maturedError.message}`);
    }

    // Get completed investments (already processed)
    const { data: completedInvestments, error: completedError } = await supabase
      .from('investments')
      .select('current_balance')
      .eq('status', 'completed');

    if (completedError) {
      throw new Error(`Failed to fetch completed investments: ${completedError.message}`);
    }

    const totalMatured = (maturedInvestments?.length || 0) + (completedInvestments?.length || 0);
    const pendingProcessing = maturedInvestments?.length || 0;
    const totalPayout = [
      ...(maturedInvestments || []),
      ...(completedInvestments || [])
    ].reduce((sum, investment) => sum + Number(investment.current_balance), 0);

    return {
      totalMatured,
      totalPayout,
      pendingProcessing
    };
  } catch (error: any) {
    console.error('Error getting maturity stats:', error);
    return {
      totalMatured: 0,
      totalPayout: 0,
      pendingProcessing: 0
    };
  }
}
