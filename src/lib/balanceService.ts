import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Types for balance management
export type UserBalance = Database['public']['Tables']['user_balances']['Row'];
export type BalanceTransaction = Database['public']['Tables']['balance_transactions']['Row'];

export interface BalanceSummary {
  available_balance: number;
  invested_balance: number;
  total_balance: number;
  active_investments_count: number;
  total_invested: number;
  total_profit_earned: number;
}

export interface TransactionHistory {
  id: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_id: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
}

export interface InvestmentDeductionResult {
  success: boolean;
  new_balance: number;
  transaction_id: string;
}

export interface MaturityPayoutResult {
  success: boolean;
  payout_amount: number;
  transaction_id: string;
}

export interface EarlyWithdrawalResult {
  success: boolean;
  withdrawal_amount: number;
  penalty_amount: number;
  transaction_id: string;
}

// Balance Management Service
export class BalanceService {
  // Get user balance summary
  static async getUserBalanceSummary(userId: string): Promise<BalanceSummary | null> {
    try {
      // Ensure we have a valid session before making requests
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('No valid session found:', sessionError);
        throw new Error('User not authenticated');
      }

      console.log('Session found for user:', session.user.id);
      
      // Add timeout and retry logic
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
      });

      const fetchPromise = this.fetchBalanceData(userId);
      
      const result = await Promise.race([fetchPromise, timeoutPromise]) as BalanceSummary;
      return result;
    } catch (error) {
      console.error('Error in getUserBalanceSummary:', error);
      
      // If it's a network error, try fallback calculation
      if (error instanceof Error && (
        error.message.includes('Failed to fetch') || 
        error.message.includes('timeout') ||
        error.message.includes('ERR_NAME_NOT_RESOLVED')
      )) {
        console.log('Network error detected, trying fallback calculation...');
        try {
          return await this.recalculateUserBalance(userId);
        } catch (fallbackError) {
          console.error('Fallback calculation also failed:', fallbackError);
          // Return default values as last resort
          return {
            available_balance: 0,
            invested_balance: 0,
            total_balance: 0,
            active_investments_count: 0,
            total_invested: 0,
            total_profit_earned: 0
          };
        }
      }
      
      throw error;
    }
  }

  // Separate method for fetching balance data with retry logic
  private static async fetchBalanceData(userId: string): Promise<BalanceSummary> {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Ensure we have a valid session before making requests
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          console.error('No valid session found in fetchBalanceData:', sessionError);
          throw new Error('User not authenticated');
        }

        // First try to get from user_balances table
        const { data: balanceData, error: balanceError } = await supabase
          .from('user_balances')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (balanceError && balanceError.code !== 'PGRST116') {
          console.error('Error fetching user balance:', balanceError);
          throw new Error('Failed to fetch user balance');
        }

        // Get investment stats
        const { data: investments, error: investmentError } = await supabase
          .from('investments')
          .select('invested_amount, total_profit_earned, status')
          .eq('user_id', userId);

        if (investmentError) {
          console.error('Error fetching investments:', investmentError);
          throw new Error('Failed to fetch investment data');
        }

        // Calculate stats
        const activeInvestments = investments?.filter(inv => inv.status === 'active') || [];
        const totalInvested = activeInvestments.reduce((sum, inv) => sum + Number(inv.invested_amount), 0);
        const totalProfitEarned = activeInvestments.reduce((sum, inv) => sum + Number(inv.total_profit_earned), 0);

        const summary: BalanceSummary = {
          available_balance: balanceData?.available_balance || 0,
          invested_balance: balanceData?.invested_balance || 0,
          total_balance: (balanceData?.available_balance || 0) + (balanceData?.invested_balance || 0),
          active_investments_count: activeInvestments.length,
          total_invested: totalInvested,
          total_profit_earned: totalProfitEarned
        };

        return summary;
      } catch (error) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.warn(`Balance fetch attempt ${retryCount} failed, retrying...`, error);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Failed to fetch balance data after maximum retries');
  }

  // Get user balance (simple version)
  static async getUserBalance(userId: string): Promise<{ available: number; invested: number; total: number } | null> {
    try {
      const { data, error } = await supabase
        .from('user_balances')
        .select('available_balance, invested_balance')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user balance:', error);
        throw new Error('Failed to fetch user balance');
      }

      const available = data?.available_balance || 0;
      const invested = data?.invested_balance || 0;

      return {
        available: Number(available),
        invested: Number(invested),
        total: Number(available) + Number(invested)
      };
    } catch (error) {
      console.error('Error in getUserBalance:', error);
      throw error;
    }
  }

  // Check if user has sufficient balance
  static async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    try {
      const balance = await this.getUserBalance(userId);
      return balance ? balance.available >= amount : false;
    } catch (error) {
      console.error('Error checking sufficient balance:', error);
      return false;
    }
  }

  // Process investment deduction
  static async processInvestmentDeduction(
    userId: string,
    investmentAmount: number,
    investmentId: string
  ): Promise<InvestmentDeductionResult> {
    try {
      // Check if user has sufficient balance
      const hasBalance = await this.hasSufficientBalance(userId, investmentAmount);
      if (!hasBalance) {
        throw new Error('Insufficient balance for investment');
      }

      // Use a transaction-like approach with retry logic for race conditions
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Get current balance with a fresh read
          const { data: currentBalance, error: balanceError } = await supabase
            .from('user_balances')
            .select('available_balance, invested_balance')
            .eq('user_id', userId)
            .single();

          if (balanceError && balanceError.code !== 'PGRST116') {
            // If no balance record exists, create one with zero values
            if (balanceError.code === 'PGRST116') {
              const { error: createError } = await supabase
                .from('user_balances')
                .insert({
                  user_id: userId,
                  available_balance: 0,
                  invested_balance: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              
              if (createError) {
                throw new Error('Failed to create user balance record');
              }
              
              // Retry the read
              const { data: newBalance, error: newBalanceError } = await supabase
                .from('user_balances')
                .select('available_balance, invested_balance')
                .eq('user_id', userId)
                .single();
                
              if (newBalanceError) {
                throw new Error('Failed to fetch user balance after creation');
              }
              
              const availableBalance = newBalance?.available_balance || 0;
              const investedBalance = newBalance?.invested_balance || 0;
              
              if (availableBalance < investmentAmount) {
                throw new Error('Insufficient balance for investment');
              }
              
              const newAvailableBalance = availableBalance - investmentAmount;
              const newInvestedBalance = investedBalance + investmentAmount;

              // Update user balance
              const { error: updateError } = await supabase
                .from('user_balances')
                .update({
                  available_balance: newAvailableBalance,
                  invested_balance: newInvestedBalance,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

              if (updateError) {
                throw new Error('Failed to update user balance');
              }

              // Create transaction record
              const { data: transactionData, error: transactionError } = await supabase
                .from('balance_transactions')
                .insert({
                  user_id: userId,
                  transaction_type: 'investment_deduction',
                  amount: -investmentAmount,
                  balance_before: availableBalance,
                  balance_after: newAvailableBalance,
                  reference_id: investmentId,
                  description: 'Investment deduction for new investment'
                })
                .select()
                .single();

              if (transactionError) {
                console.error('Failed to create transaction record:', transactionError);
                // Don't throw error here as the main operation succeeded
              }

              return {
                success: true,
                new_balance: newAvailableBalance,
                transaction_id: transactionData?.id || ''
              };
            } else {
              throw new Error('Failed to fetch current balance');
            }
          }

          const availableBalance = currentBalance?.available_balance || 0;
          const investedBalance = currentBalance?.invested_balance || 0;
          
          if (availableBalance < investmentAmount) {
            throw new Error('Insufficient balance for investment');
          }
          
          const newAvailableBalance = availableBalance - investmentAmount;
          const newInvestedBalance = investedBalance + investmentAmount;

          // Update user balance with optimistic locking
          const { error: updateError } = await supabase
            .from('user_balances')
            .update({
              available_balance: newAvailableBalance,
              invested_balance: newInvestedBalance,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('available_balance', availableBalance) // Optimistic locking condition

          if (updateError) {
            // If update failed due to conflict, retry
            if (updateError.code === 'PGRST116' || updateError.message.includes('conflict')) {
              retryCount++;
              if (retryCount < maxRetries) {
                console.log(`Balance update conflict, retrying... (${retryCount}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 100 * retryCount)); // Exponential backoff
                continue;
              }
            }
            throw new Error('Failed to update user balance');
          }

          // Create transaction record
          const { data: transactionData, error: transactionError } = await supabase
            .from('balance_transactions')
            .insert({
              user_id: userId,
              transaction_type: 'investment_deduction',
              amount: -investmentAmount,
              balance_before: availableBalance,
              balance_after: newAvailableBalance,
              reference_id: investmentId,
              description: 'Investment deduction for new investment'
            })
            .select()
            .single();

          if (transactionError) {
            console.error('Failed to create transaction record:', transactionError);
            // Don't throw error here as the main operation succeeded
          }

          return {
            success: true,
            new_balance: newAvailableBalance,
            transaction_id: transactionData?.id || ''
          };
        } catch (retryError) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw retryError;
          }
          console.log(`Balance deduction failed, retrying... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 100 * retryCount)); // Exponential backoff
        }
      }
      
      throw new Error('Failed to process balance deduction after maximum retries');
    } catch (error) {
      console.error('Error in processInvestmentDeduction:', error);
      throw error;
    }
  }

  // Process investment maturity payout
  static async processInvestmentMaturity(
    userId: string,
    maturityAmount: number,
    originalInvestmentAmount: number,
    investmentId: string
  ): Promise<MaturityPayoutResult> {
    try {
      // Get current balance
      const { data: currentBalance, error: balanceError } = await supabase
        .from('user_balances')
        .select('available_balance, invested_balance')
        .eq('user_id', userId)
        .single();

      if (balanceError && balanceError.code !== 'PGRST116') {
        throw new Error('Failed to fetch current balance');
      }

      const availableBalance = currentBalance?.available_balance || 0;
      const investedBalance = currentBalance?.invested_balance || 0;
      const newAvailableBalance = availableBalance + maturityAmount;
      const newInvestedBalance = investedBalance - originalInvestmentAmount;

      // Update user balance
      const { error: updateError } = await supabase
        .from('user_balances')
        .upsert({
          user_id: userId,
          available_balance: newAvailableBalance,
          invested_balance: Math.max(0, newInvestedBalance), // Ensure non-negative
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        throw new Error('Failed to update user balance');
      }

      // Create transaction record for maturity payout
      const { data: transactionData, error: transactionError } = await supabase
        .from('balance_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'maturity_payout',
          amount: maturityAmount,
          balance_before: availableBalance,
          balance_after: newAvailableBalance,
          reference_id: investmentId,
          description: 'Investment maturity payout'
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Failed to create transaction record:', transactionError);
        // Don't throw error here as the main operation succeeded
      }

      return {
        success: true,
        payout_amount: maturityAmount,
        transaction_id: transactionData?.id || ''
      };
    } catch (error) {
      console.error('Error in processInvestmentMaturity:', error);
      throw error;
    }
  }

  // Process early withdrawal with penalty
  static async processEarlyWithdrawal(
    userId: string,
    currentBalance: number,
    penaltyPercent: number,
    investmentId: string
  ): Promise<EarlyWithdrawalResult> {
    try {
      const penaltyAmount = currentBalance * (penaltyPercent / 100);
      const withdrawalAmount = currentBalance - penaltyAmount;

      // Get current balance
      const { data: currentUserBalance, error: balanceError } = await supabase
        .from('user_balances')
        .select('available_balance, invested_balance')
        .eq('user_id', userId)
        .single();

      if (balanceError && balanceError.code !== 'PGRST116') {
        throw new Error('Failed to fetch current balance');
      }

      const availableBalance = currentUserBalance?.available_balance || 0;
      const investedBalance = currentUserBalance?.invested_balance || 0;
      const newAvailableBalance = availableBalance + withdrawalAmount;
      const newInvestedBalance = investedBalance - currentBalance;

      // Update user balance
      const { error: updateError } = await supabase
        .from('user_balances')
        .upsert({
          user_id: userId,
          available_balance: newAvailableBalance,
          invested_balance: Math.max(0, newInvestedBalance), // Ensure non-negative
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        throw new Error('Failed to update user balance');
      }

      // Create transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('balance_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'early_withdrawal',
          amount: withdrawalAmount,
          balance_before: availableBalance,
          balance_after: newAvailableBalance,
          reference_id: investmentId,
          description: `Early withdrawal with ${penaltyPercent}% penalty applied`
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Failed to create transaction record:', transactionError);
        // Don't throw error here as the main operation succeeded
      }

      return {
        success: true,
        withdrawal_amount: withdrawalAmount,
        penalty_amount: penaltyAmount,
        transaction_id: transactionData?.id || ''
      };
    } catch (error) {
      console.error('Error in processEarlyWithdrawal:', error);
      throw error;
    }
  }

  // Get transaction history
  static async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionHistory[]> {
    try {
      const { data, error } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching transaction history:', error);
        throw new Error('Failed to fetch transaction history');
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTransactionHistory:', error);
      throw error;
    }
  }

  // Add deposit to balance
  static async addDeposit(
    userId: string,
    amount: number,
    depositId: string,
    description?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_user_balance', {
        user_uuid: userId,
        amount_change: amount,
        transaction_type: 'deposit',
        reference_id: depositId,
        description: description || 'Deposit added to balance'
      });

      if (error) {
        console.error('Error adding deposit to balance:', error);
        throw new Error('Failed to add deposit to balance');
      }

      return true;
    } catch (error) {
      console.error('Error in addDeposit:', error);
      throw error;
    }
  }

  // Process withdrawal from balance
  static async processWithdrawal(
    userId: string,
    amount: number,
    withdrawalId: string,
    description?: string
  ): Promise<boolean> {
    try {
      // Check if user has sufficient balance
      const hasBalance = await this.hasSufficientBalance(userId, amount);
      if (!hasBalance) {
        throw new Error('Insufficient balance for withdrawal');
      }

      const { error } = await supabase.rpc('update_user_balance', {
        user_uuid: userId,
        amount_change: -amount,
        transaction_type: 'withdrawal',
        reference_id: withdrawalId,
        description: description || 'Withdrawal processed'
      });

      if (error) {
        console.error('Error processing withdrawal:', error);
        throw new Error('Failed to process withdrawal');
      }

      return true;
    } catch (error) {
      console.error('Error in processWithdrawal:', error);
      throw error;
    }
  }

  // Add referral bonus
  static async addReferralBonus(
    userId: string,
    amount: number,
    referralId: string,
    description?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_user_balance', {
        user_uuid: userId,
        amount_change: amount,
        transaction_type: 'referral_bonus',
        reference_id: referralId,
        description: description || 'Referral bonus earned'
      });

      if (error) {
        console.error('Error adding referral bonus:', error);
        throw new Error('Failed to add referral bonus');
      }

      return true;
    } catch (error) {
      console.error('Error in addReferralBonus:', error);
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

  // Format transaction type for display
  static formatTransactionType(type: string): string {
    const typeMap: Record<string, string> = {
      'deposit': 'Deposit',
      'withdrawal': 'Withdrawal',
      'investment_deduction': 'Investment',
      'investment_return': 'Investment Return',
      'early_withdrawal': 'Early Withdrawal',
      'maturity_payout': 'Maturity Payout',
      'referral_bonus': 'Referral Bonus',
      'admin_adjustment': 'Admin Adjustment'
    };
    return typeMap[type] || type;
  }

  // Get transaction icon
  static getTransactionIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'deposit': '💰',
      'withdrawal': '💸',
      'investment_deduction': '📈',
      'investment_return': '📊',
      'early_withdrawal': '⚠️',
      'maturity_payout': '🎉',
      'referral_bonus': '🎁',
      'admin_adjustment': '⚙️'
    };
    return iconMap[type] || '💳';
  }

  // Get transaction color
  static getTransactionColor(type: string): string {
    const colorMap: Record<string, string> = {
      'deposit': 'text-green-600',
      'withdrawal': 'text-red-600',
      'investment_deduction': 'text-blue-600',
      'investment_return': 'text-green-600',
      'early_withdrawal': 'text-orange-600',
      'maturity_payout': 'text-green-600',
      'referral_bonus': 'text-purple-600',
      'admin_adjustment': 'text-gray-600'
    };
    return colorMap[type] || 'text-gray-600';
  }

  // Calculate total profit from all investments
  static async calculateTotalProfit(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('total_profit_earned')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        console.error('Error calculating total profit:', error);
        return 0;
      }

      return data?.reduce((sum, investment) => sum + Number(investment.total_profit_earned), 0) || 0;
    } catch (error) {
      console.error('Error in calculateTotalProfit:', error);
      return 0;
    }
  }

  // Get balance change over time (for charts)
  static async getBalanceHistory(
    userId: string,
    days: number = 30
  ): Promise<{ date: string; balance: number }[]> {
    try {
      const { data, error } = await supabase
        .from('balance_transactions')
        .select('created_at, balance_after')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching balance history:', error);
        return [];
      }

      return data?.map(transaction => ({
        date: new Date(transaction.created_at).toISOString().split('T')[0],
        balance: Number(transaction.balance_after)
      })) || [];
    } catch (error) {
      console.error('Error in getBalanceHistory:', error);
      return [];
    }
  }

  // Recalculate user balance using fallback method (for fixing balance issues)
  static async recalculateUserBalance(userId: string): Promise<BalanceSummary | null> {
    try {
      // Ensure we have a valid session before making requests
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('No valid session found:', sessionError);
        throw new Error('User not authenticated');
      }

      console.log('Session found for user:', session.user.id);
      
      // Fetch approved deposits only (wallet balance = deposited funds only)
      const { data: deposits } = await supabase
        .from('deposits')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'approved');

      // Fetch total earnings (distributed profits)
      const { data: earnings } = await supabase
        .from('earnings')
        .select('amount')
        .eq('user_id', userId);

      // Fetch completed withdrawals to subtract from deposited amount (only wallet withdrawals)
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

      // Calculate wallet balance: deposited funds only (affected only by wallet withdrawals)
      const totalDeposits = deposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
      const totalCompletedWalletWithdrawals = completedWalletWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
      const availableBalance = totalDeposits - totalCompletedWalletWithdrawals;
      
      const totalEarnings = earnings?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;

      // Calculate invested balance from active investments
      const investedBalance = investments?.reduce((sum, inv) => sum + Number(inv.invested_amount), 0) || 0;
      const totalProfitEarned = investments?.reduce((sum, inv) => sum + Number(inv.total_profit_earned), 0) || 0;

      const summary: BalanceSummary = {
        available_balance: availableBalance,
        invested_balance: investedBalance,
        total_balance: availableBalance + investedBalance,
        active_investments_count: investments?.length || 0,
        total_invested: investedBalance,
        total_profit_earned: totalProfitEarned
      };

      // Update the user_balances table with the recalculated values
      const { error: updateError } = await supabase
        .from('user_balances')
        .upsert({
          user_id: userId,
          available_balance: availableBalance,
          invested_balance: investedBalance,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        console.error('Error updating user balance:', updateError);
        // Don't throw error here, just log it
      }

      return summary;
    } catch (error) {
      console.error('Error in recalculateUserBalance:', error);
      throw error;
    }
  }
}
