import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { BalanceService } from './balanceService';

// Types for investment plans and investments
export type InvestmentPlan = Database['public']['Tables']['investment_plans']['Row'];
export type Investment = Database['public']['Tables']['investments']['Row'];
export type InvestmentCompound = Database['public']['Tables']['investment_compounds']['Row'];

export type CreateInvestment = Database['public']['Tables']['investments']['Insert'];
export type UpdateInvestment = Database['public']['Tables']['investments']['Update'];

export interface InvestmentWithPlan extends Investment {
  plan: InvestmentPlan;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export interface InvestmentStats {
  totalInvested: number;
  totalProfit: number;
  currentBalance: number;
  activeInvestments: number;
}

export interface CompoundResult {
  investment_id: string;
  profit_amount: number;
  new_balance: number;
}

// Investment Plans Service
export class InvestmentService {
  // Get all active investment plans
  static async getInvestmentPlans(): Promise<InvestmentPlan[]> {
    const { data, error } = await supabase
      .from('investment_plans')
      .select('*')
      .eq('is_active', true)
      .order('min_amount', { ascending: true });

    if (error) {
      console.error('Error fetching investment plans:', error);
      throw new Error('Failed to fetch investment plans');
    }

    return data || [];
  }

  // Get investment plan by ID
  static async getInvestmentPlan(planId: string): Promise<InvestmentPlan | null> {
    const { data, error } = await supabase
      .from('investment_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching investment plan:', error);
      return null;
    }

    return data;
  }

  // Create a new investment
  static async createInvestment(
    planId: string,
    amount: number,
    userId: string,
    durationWeeks?: number
  ): Promise<Investment | null> {
    // First, get the plan to validate minimum amount
    const plan = await this.getInvestmentPlan(planId);
    if (!plan) {
      throw new Error('Investment plan not found');
    }

    if (amount < plan.min_amount) {
      throw new Error(`Minimum investment amount is $${plan.min_amount}`);
    }

    // Check if user has sufficient balance (with fallback)
    try {
      const hasBalance = await BalanceService.hasSufficientBalance(userId, amount);
      if (!hasBalance) {
        throw new Error('Insufficient balance. Please deposit funds before investing.');
      }
    } catch (balanceError) {
      console.warn('Balance service not available, skipping balance check:', balanceError);
      // Continue without balance check if balance service is not available
    }

    // Validate duration
    const selectedDuration = durationWeeks || 12; // Default to 12 weeks if not specified
    if (selectedDuration < 1) {
      throw new Error('Minimum investment duration is 1 month (4 weeks)');
    }

    // Calculate next compound date (7 days from now)
    const nextCompoundDate = new Date();
    nextCompoundDate.setDate(nextCompoundDate.getDate() + 7);

    // Calculate maturity date
    const startDate = new Date();
    const maturityDate = new Date(startDate.getTime() + (selectedDuration * 7 * 24 * 60 * 60 * 1000));

    // Calculate projected maturity value
    const projectedMaturityValue = this.calculateProjectedMaturityValue(
      amount,
      plan.weekly_profit_percent,
      selectedDuration
    );

    const investmentData: CreateInvestment = {
      user_id: userId,
      plan_id: planId,
      invested_amount: amount,
      current_balance: amount,
      total_profit_earned: 0,
      status: 'active',
      start_date: startDate.toISOString(),
      last_compound_date: startDate.toISOString(),
      next_compound_date: nextCompoundDate.toISOString(),
      end_date: maturityDate.toISOString(),
      user_selected_duration_weeks: selectedDuration,
      maturity_date: maturityDate.toISOString(),
      early_withdrawal_penalty_percent: 50.00,
      is_matured: false,
      projected_maturity_value: projectedMaturityValue
    };

    // Process balance deduction BEFORE creating investment
    let balanceDeductionResult = null;
    try {
      // Generate a temporary investment ID for the balance deduction
      // We'll use a simple timestamp-based ID
      const tempInvestmentId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      balanceDeductionResult = await BalanceService.processInvestmentDeduction(userId, amount, tempInvestmentId);
    } catch (balanceError: any) {
      console.error('Balance deduction failed:', balanceError);
      
      // Provide more specific error messages based on the error type
      if (balanceError.message?.includes('Insufficient balance')) {
        throw new Error('Insufficient balance. Please deposit funds before investing.');
      } else if (balanceError.message?.includes('conflict') || balanceError.message?.includes('409')) {
        throw new Error('Balance update conflict. Please try again in a moment.');
      } else if (balanceError.message?.includes('Failed to fetch')) {
        throw new Error('Unable to verify your balance. Please refresh and try again.');
      } else {
        throw new Error('Failed to process balance deduction. Please try again.');
      }
    }

    // Create the investment only after successful balance deduction
    const { data, error } = await supabase
      .from('investments')
      .insert(investmentData)
      .select()
      .single();

    if (error) {
      console.error('Error creating investment:', error);
      // If investment creation fails, we need to rollback the balance deduction
      try {
        // Rollback balance deduction by adding the amount back to available balance
        const { error: rollbackError } = await supabase
          .from('user_balances')
          .upsert({
            user_id: userId,
            available_balance: (balanceDeductionResult?.new_balance || 0) + amount,
            invested_balance: 0, // Keep invested balance as 0 since investment failed
            updated_at: new Date().toISOString()
          });
        
        if (rollbackError) {
          console.error('Failed to rollback balance deduction:', rollbackError);
        }
      } catch (rollbackError) {
        console.error('Error during balance rollback:', rollbackError);
      }
      
      throw new Error('Failed to create investment');
    }

    // Update the balance transaction with the actual investment ID
    if (balanceDeductionResult?.transaction_id) {
      try {
        await supabase
          .from('balance_transactions')
          .update({ reference_id: data.id })
          .eq('id', balanceDeductionResult.transaction_id);
      } catch (updateError) {
        console.warn('Failed to update transaction reference ID:', updateError);
        // This is not critical, so we don't throw an error
      }
    }

    return data;
  }

  // Get user's investments
  static async getUserInvestments(userId: string): Promise<InvestmentWithPlan[]> {
    const { data, error } = await supabase
      .from('investments')
      .select(`
        *,
        plan:investment_plans(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user investments:', error);
      throw new Error('Failed to fetch investments');
    }

    return data || [];
  }

  // Get investment by ID
  static async getInvestment(investmentId: string, userId: string): Promise<InvestmentWithPlan | null> {
    const { data, error } = await supabase
      .from('investments')
      .select(`
        *,
        plan:investment_plans(*)
      `)
      .eq('id', investmentId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching investment:', error);
      return null;
    }

    return data;
  }

  // Get investment compounds history
  static async getInvestmentCompounds(investmentId: string, userId: string): Promise<InvestmentCompound[]> {
    // First verify the investment belongs to the user
    const investment = await this.getInvestment(investmentId, userId);
    if (!investment) {
      throw new Error('Investment not found');
    }

    const { data, error } = await supabase
      .from('investment_compounds')
      .select('*')
      .eq('investment_id', investmentId)
      .order('compound_date', { ascending: false });

    if (error) {
      console.error('Error fetching investment compounds:', error);
      throw new Error('Failed to fetch compound history');
    }

    return data || [];
  }

  // Get user's investment statistics
  static async getUserInvestmentStats(userId: string): Promise<InvestmentStats> {
    const { data, error } = await supabase
      .from('investments')
      .select('invested_amount, current_balance, total_profit_earned, status')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching investment stats:', error);
      throw new Error('Failed to fetch investment statistics');
    }

    const stats: InvestmentStats = {
      totalInvested: 0,
      totalProfit: 0,
      currentBalance: 0,
      activeInvestments: 0
    };

    data?.forEach(investment => {
      stats.totalInvested += investment.invested_amount;
      stats.totalProfit += investment.total_profit_earned;
      stats.currentBalance += investment.current_balance;
      if (investment.status === 'active') {
        stats.activeInvestments += 1;
      }
    });

    return stats;
  }

  // Update investment status
  static async updateInvestmentStatus(
    investmentId: string,
    status: 'active' | 'paused' | 'completed' | 'cancelled',
    userId: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('investments')
      .update({ status })
      .eq('id', investmentId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating investment status:', error);
      return false;
    }

    return true;
  }

  // Apply weekly compounding (admin function)
  static async applyWeeklyCompounding(): Promise<CompoundResult[]> {
    const { data, error } = await supabase.rpc('apply_weekly_compounding');

    if (error) {
      console.error('Error applying weekly compounding:', error);
      throw new Error('Failed to apply weekly compounding');
    }

    return data || [];
  }

  // Calculate projected returns
  static calculateProjectedReturns(
    amount: number,
    weeklyProfitPercent: number,
    weeks: number
  ): { week: number; balance: number; profit: number }[] {
    const results = [];
    let balance = amount;
    let totalProfit = 0;

    for (let week = 1; week <= weeks; week++) {
      const profit = balance * (weeklyProfitPercent / 100);
      balance += profit;
      totalProfit += profit;

      results.push({
        week,
        balance: Math.round(balance * 100) / 100,
        profit: Math.round(profit * 100) / 100
      });
    }

    return results;
  }

  // Calculate projected maturity value
  static calculateProjectedMaturityValue(
    amount: number,
    weeklyProfitPercent: number,
    durationWeeks: number
  ): number {
    let balance = amount;
    
    for (let week = 1; week <= durationWeeks; week++) {
      balance = balance * (1 + weeklyProfitPercent / 100);
    }
    
    return Math.round(balance * 100) / 100;
  }

  // Calculate investment progress percentage
  static calculateInvestmentProgress(
    startDate: string,
    maturityDate: string
  ): number {
    const start = new Date(startDate);
    const maturity = new Date(maturityDate);
    const now = new Date();
    
    const totalDuration = maturity.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    const progress = (elapsed / totalDuration) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  // Calculate days until maturity
  static getDaysUntilMaturity(maturityDate: string): number {
    const maturity = new Date(maturityDate);
    const now = new Date();
    const diffTime = maturity.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  // Check if investment is matured
  static isInvestmentMatured(maturityDate: string): boolean {
    const maturity = new Date(maturityDate);
    const now = new Date();
    return maturity <= now;
  }

  // Calculate early withdrawal amount (with penalty)
  static calculateEarlyWithdrawalAmount(
    currentBalance: number,
    penaltyPercent: number
  ): number {
    const penaltyAmount = currentBalance * (penaltyPercent / 100);
    return Math.max(0, currentBalance - penaltyAmount);
  }

  // Get duration options for UI
  static getDurationOptions(): { value: number; label: string; weeks: number }[] {
    return [
      { value: 4, label: '1 Month', weeks: 4 },
      { value: 12, label: '3 Months', weeks: 12 },
      { value: 24, label: '6 Months', weeks: 24 },
      { value: 48, label: '12 Months', weeks: 48 }
    ];
  }

  // Process early withdrawal with penalty
  static async processEarlyWithdrawal(
    investmentId: string,
    userId: string
  ): Promise<{ success: boolean; withdrawalAmount: number; penaltyAmount: number }> {
    try {
      // Get the investment
      const investment = await this.getInvestment(investmentId, userId);
      if (!investment) {
        throw new Error('Investment not found');
      }

      if (investment.status !== 'active') {
        throw new Error('Investment is not active');
      }

      if (investment.is_matured) {
        throw new Error('Investment has already matured');
      }

      // Calculate early withdrawal amount
      const withdrawalAmount = this.calculateEarlyWithdrawalAmount(
        investment.current_balance,
        investment.early_withdrawal_penalty_percent
      );

      const penaltyAmount = investment.current_balance - withdrawalAmount;

      // Update investment status to cancelled
      const { error: updateError } = await supabase
        .from('investments')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', investmentId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error('Failed to update investment status');
      }

      // Process early withdrawal through balance service
      await BalanceService.processEarlyWithdrawal(
        userId,
        investment.current_balance,
        investment.early_withdrawal_penalty_percent,
        investmentId
      );

      return {
        success: true,
        withdrawalAmount,
        penaltyAmount
      };
    } catch (error) {
      console.error('Error processing early withdrawal:', error);
      throw error;
    }
  }

  // Process investment maturity
  static async processInvestmentMaturity(
    investmentId: string,
    userId: string
  ): Promise<{ success: boolean; maturityAmount: number }> {
    try {
      // Get the investment
      const investment = await this.getInvestment(investmentId, userId);
      if (!investment) {
        throw new Error('Investment not found');
      }

      if (investment.status !== 'active') {
        throw new Error('Investment is not active');
      }

      if (!investment.is_matured) {
        throw new Error('Investment has not matured yet');
      }

      const maturityAmount = investment.current_balance;

      // Update investment status to completed
      const { error: updateError } = await supabase
        .from('investments')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', investmentId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error('Failed to update investment status');
      }

      // Process maturity payout through balance service
      await BalanceService.processInvestmentMaturity(
        userId,
        maturityAmount,
        investment.invested_amount,
        investmentId
      );

      return {
        success: true,
        maturityAmount
      };
    } catch (error) {
      console.error('Error processing investment maturity:', error);
      throw error;
    }
  }

  // Format currency
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Format percentage
  static formatPercentage(percent: number): string {
    return `${percent}%`;
  }

  // Calculate days until next compound
  static getDaysUntilNextCompound(nextCompoundDate: string): number {
    const now = new Date();
    const nextDate = new Date(nextCompoundDate);
    const diffTime = nextDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
}
