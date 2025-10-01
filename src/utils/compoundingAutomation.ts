import { supabase } from '@/integrations/supabase/client';
import { InvestmentService } from '@/lib/investmentService';

export interface CompoundingResult {
  success: boolean;
  processedCount: number;
  totalProfitApplied: number;
  errors: string[];
}

export class CompoundingAutomation {
  /**
   * Apply weekly compounding to all eligible investments
   * This function should be called by a cron job or scheduled task
   */
  static async applyWeeklyCompounding(): Promise<CompoundingResult> {
    const result: CompoundingResult = {
      success: true,
      processedCount: 0,
      totalProfitApplied: 0,
      errors: []
    };

    try {
      console.log('Starting weekly compounding process...');

      // Get all active investments that are due for compounding
      const { data: investments, error: fetchError } = await supabase
        .from('investments')
        .select(`
          id,
          user_id,
          plan_id,
          current_balance,
          total_profit_earned,
          next_compound_date,
          plan:investment_plans(weekly_profit_percent)
        `)
        .eq('status', 'active')
        .lte('next_compound_date', new Date().toISOString());

      if (fetchError) {
        throw new Error(`Failed to fetch investments: ${fetchError.message}`);
      }

      if (!investments || investments.length === 0) {
        console.log('No investments due for compounding');
        return result;
      }

      console.log(`Found ${investments.length} investments due for compounding`);

      // Process each investment
      for (const investment of investments) {
        try {
          await this.processInvestmentCompounding(investment);
          result.processedCount++;
        } catch (error: any) {
          console.error(`Error processing investment ${investment.id}:`, error);
          result.errors.push(`Investment ${investment.id}: ${error.message}`);
        }
      }

      console.log(`Weekly compounding completed. Processed: ${result.processedCount}, Errors: ${result.errors.length}`);

    } catch (error: any) {
      console.error('Weekly compounding failed:', error);
      result.success = false;
      result.errors.push(`System error: ${error.message}`);
    }

    return result;
  }

  /**
   * Process compounding for a single investment
   */
  private static async processInvestmentCompounding(investment: any): Promise<void> {
    const { id, user_id, plan_id, current_balance, total_profit_earned, plan } = investment;
    
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Calculate profit
    const profitAmount = current_balance * (plan.weekly_profit_percent / 100);
    const newBalance = current_balance + profitAmount;
    const newTotalProfit = total_profit_earned + profitAmount;

    // Calculate next compound date (7 days from now)
    const nextCompoundDate = new Date();
    nextCompoundDate.setDate(nextCompoundDate.getDate() + 7);

    // Update investment in database
    const { error: updateError } = await supabase
      .from('investments')
      .update({
        current_balance: newBalance,
        total_profit_earned: newTotalProfit,
        last_compound_date: new Date().toISOString(),
        next_compound_date: nextCompoundDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw new Error(`Failed to update investment: ${updateError.message}`);
    }

    // Record the compound transaction
    const { error: compoundError } = await supabase
      .from('investment_compounds')
      .insert({
        investment_id: id,
        compound_date: new Date().toISOString(),
        balance_before: current_balance,
        profit_amount: profitAmount,
        balance_after: newBalance
      });

    if (compoundError) {
      console.error(`Failed to record compound for investment ${id}:`, compoundError);
      // Don't throw error - the main update succeeded
    }

    // Create earnings record
    const { error: earningsError } = await supabase
      .from('earnings')
      .insert({
        user_id,
        amount: profitAmount,
        currency: 'USDT',
        earnings_date: new Date().toISOString().split('T')[0],
        description: `Weekly compound profit from ${plan.plan_name} plan`,
        source: 'investment_compounding',
        reference_id: id
      });

    if (earningsError) {
      console.error(`Failed to create earnings record for investment ${id}:`, earningsError);
      // Don't throw error - the main update succeeded
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id,
        type: 'profit',
        amount: profitAmount,
        currency: 'USDT',
        status: 'completed',
        description: `Weekly compound profit - ${plan.plan_name} plan`,
        reference_id: id
      });

    if (transactionError) {
      console.error(`Failed to create transaction record for investment ${id}:`, transactionError);
      // Don't throw error - the main update succeeded
    }

    console.log(`Applied compounding to investment ${id}: +$${profitAmount.toFixed(2)} (New balance: $${newBalance.toFixed(2)})`);
  }

  /**
   * Check if any investments are due for compounding
   */
  static async getInvestmentsDueForCompounding(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('id', { count: 'exact' })
        .eq('status', 'active')
        .lte('next_compound_date', new Date().toISOString());

      if (error) {
        console.error('Error checking investments due for compounding:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error checking investments due for compounding:', error);
      return 0;
    }
  }

  /**
   * Get compounding statistics
   */
  static async getCompoundingStats(): Promise<{
    totalActiveInvestments: number;
    dueForCompounding: number;
    totalInvested: number;
    totalProfit: number;
  }> {
    try {
      const { data: activeInvestments, error: activeError } = await supabase
        .from('investments')
        .select('invested_amount, current_balance, total_profit_earned, next_compound_date')
        .eq('status', 'active');

      if (activeError) {
        throw new Error(`Failed to fetch active investments: ${activeError.message}`);
      }

      const now = new Date();
      const dueForCompounding = activeInvestments?.filter(inv => 
        new Date(inv.next_compound_date) <= now
      ).length || 0;

      const totalInvested = activeInvestments?.reduce((sum, inv) => sum + inv.invested_amount, 0) || 0;
      const totalProfit = activeInvestments?.reduce((sum, inv) => sum + inv.total_profit_earned, 0) || 0;

      return {
        totalActiveInvestments: activeInvestments?.length || 0,
        dueForCompounding,
        totalInvested,
        totalProfit
      };
    } catch (error) {
      console.error('Error getting compounding stats:', error);
      return {
        totalActiveInvestments: 0,
        dueForCompounding: 0,
        totalInvested: 0,
        totalProfit: 0
      };
    }
  }

  /**
   * Manual compounding trigger for testing
   */
  static async triggerManualCompounding(): Promise<CompoundingResult> {
    console.log('Manual compounding triggered');
    return await this.applyWeeklyCompounding();
  }
}

// Export for use in cron jobs or manual triggers
export default CompoundingAutomation;
