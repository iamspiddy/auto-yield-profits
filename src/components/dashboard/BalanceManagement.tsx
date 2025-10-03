import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  AlertCircle, 
  RefreshCw,
  Plus,
  Minus,
  Eye,
  EyeOff
} from 'lucide-react';
import { BalanceService, type BalanceSummary } from '@/lib/balanceService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { NetworkHealthService } from '@/lib/networkHealth';
import { SupabaseTest } from '@/lib/supabaseTest';

interface BalanceManagementProps {
  onDepositClick?: () => void;
  onWithdrawClick?: () => void;
  onInvestClick?: () => void;
}

// Fallback balance calculation using the old method
const calculateFallbackBalance = async (userId: string): Promise<BalanceSummary> => {
  try {
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

    // Fetch pending withdrawals
    const { data: pendingWithdrawalsData } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing']);

    // Fetch completed earnings withdrawals (deductions)
    const { data: completedEarningsWithdrawals } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .eq('withdrawal_type', 'earnings');

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
    const pendingWithdrawals = pendingWithdrawalsData?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
    const completedEarningsDeductions = completedEarningsWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;

    // Calculate invested balance from active investments
    const investedBalance = investments?.reduce((sum, inv) => sum + Number(inv.invested_amount), 0) || 0;
    const totalProfitEarned = investments?.reduce((sum, inv) => sum + Number(inv.total_profit_earned), 0) || 0;

    // Debug logging
    console.log('Fallback calculation debug:');
    console.log('  Deposits:', deposits?.length || 0, 'Total:', totalDeposits);
    console.log('  Completed wallet withdrawals:', completedWalletWithdrawals?.length || 0, 'Total:', totalCompletedWalletWithdrawals);
    console.log('  Earnings:', earnings?.length || 0, 'Total:', totalEarnings);
    console.log('  Investments:', investments?.length || 0, 'Total invested:', investedBalance);
    console.log('  Available balance:', availableBalance);
    console.log('  Invested balance:', investedBalance);

    return {
      available_balance: availableBalance,
      invested_balance: investedBalance,
      total_balance: availableBalance + investedBalance,
      active_investments_count: investments?.length || 0,
      total_invested: investedBalance,
      total_profit_earned: totalProfitEarned
    };
  } catch (error) {
    console.error('Error in fallback balance calculation:', error);
    throw error;
  }
};

const BalanceManagement: React.FC<BalanceManagementProps> = ({
  onDepositClick,
  onWithdrawClick,
  onInvestClick
}) => {
  const [balanceData, setBalanceData] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(true); // Show balance by default
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchBalanceData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setBalanceError(null); // Clear any previous errors
      
      // Run network diagnostics first
      await NetworkHealthService.logNetworkDiagnostics();
      
      // Run Supabase connection test
      const testResults = await SupabaseTest.runAllTests();
      console.log('🧪 Supabase test results:', testResults);
      
      // Add retry logic for 409 conflicts
      let retryCount = 0;
      const maxRetries = 3;
      let data = null;
      
      while (retryCount < maxRetries) {
        try {
          data = await BalanceService.getUserBalanceSummary(user.id);
          break; // Success, exit retry loop
        } catch (error: any) {
          if (error.message?.includes('409') || error.message?.includes('conflict')) {
            retryCount++;
            if (retryCount < maxRetries) {
              console.log(`Balance fetch conflict, retrying... (${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, 500 * retryCount)); // Exponential backoff
              continue;
            }
          }
          throw error; // Re-throw if not a conflict or max retries reached
        }
      }
      
      if (!data) {
        throw new Error('Failed to fetch balance data after retries');
      }
      
      // If the balance data is null or has zero values, try fallback calculation
      if (!data || (data.available_balance === 0 && data.invested_balance === 0)) {
        console.log('Balance data is null or zero, trying fallback calculation...');
        console.log('Original data:', data);
        try {
          const fallbackData = await BalanceService.recalculateUserBalance(user.id);
          console.log('Recalculated balance data:', fallbackData);
          setBalanceData(fallbackData);
        } catch (recalcError) {
          console.error('Recalculate failed, trying manual fallback:', recalcError);
          const fallbackData = await calculateFallbackBalance(user.id);
          console.log('Manual fallback balance data:', fallbackData);
          setBalanceData(fallbackData);
        }
      } else {
        console.log('Using existing balance data:', data);
        setBalanceData(data);
      }
    } catch (error: any) {
      console.error('Error fetching balance data:', error);
      
      // Run network diagnostics on error
      const diagnostics = await NetworkHealthService.getNetworkDiagnostics();
      console.log('Network diagnostics on error:', diagnostics);
      
      // Provide more specific error messages based on diagnostics
      if (!diagnostics.online) {
        setBalanceError('You appear to be offline. Please check your internet connection.');
      } else if (!diagnostics.urlReachable) {
        setBalanceError('Unable to reach the server. Please try again in a few moments.');
      } else if (error.message?.includes('409') || error.message?.includes('conflict')) {
        setBalanceError('Balance data is temporarily unavailable due to a conflict. Please try again in a moment.');
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
        setBalanceError('Network connection issue detected. Please check your connection and try again.');
      } else {
        setBalanceError('Failed to load balance data. Please try refreshing the page.');
      }
      
      // Try fallback calculation on error
      try {
        const fallbackData = await BalanceService.recalculateUserBalance(user.id);
        setBalanceData(fallbackData);
        setBalanceError(null);
      } catch (recalcError) {
        console.error('Recalculate failed, trying manual fallback:', recalcError);
        try {
          const fallbackData = await calculateFallbackBalance(user.id);
          setBalanceData(fallbackData);
          setBalanceError(null);
        } catch (fallbackError) {
          console.error('Fallback calculation failed:', fallbackError);
          setBalanceError('Unable to calculate balance. Please try refreshing.');
          // Set default values as last resort
          setBalanceData({
            available_balance: 0,
            invested_balance: 0,
            total_balance: 0,
            active_investments_count: 0,
            total_invested: 0,
            total_profit_earned: 0
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceData();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getBalanceStatus = () => {
    if (!balanceData) return 'loading';
    if (balanceData.available_balance === 0) return 'empty';
    if (balanceData.available_balance < 100) return 'low';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'empty': return 'text-red-600';
      case 'low': return 'text-orange-600';
      case 'healthy': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'empty': return 'No funds available. Deposit to start investing.';
      case 'low': return 'Low balance. Consider depositing more funds.';
      case 'healthy': return 'Balance is healthy. Ready to invest!';
      default: return 'Loading balance...';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Balance Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading balance...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!balanceData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Balance Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load balance information. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const status = getBalanceStatus();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Balance Overview</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchBalanceData}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Balance Status Alert */}
        <Alert className={status === 'empty' ? 'border-red-200 bg-red-50' : status === 'low' ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
          <AlertCircle className={`h-4 w-4 ${getStatusColor(status)}`} />
          <AlertDescription className={getStatusColor(status)}>
            {getStatusMessage(status)}
          </AlertDescription>
        </Alert>

        {/* Balance Error Alert */}
        {balanceError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {balanceError}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Balance Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Available Balance */}
          <div className="space-y-4">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <DollarSign className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Available Balance
                </h3>
              </div>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {showDetails ? formatCurrency(balanceData.available_balance) : '••••••'}
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Ready to invest or withdraw
              </p>
            </div>

            {/* Available Balance Actions */}
            <div className="flex space-x-2">
              <Button
                onClick={onDepositClick}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={status === 'loading'}
              >
                <Plus className="h-4 w-4 mr-2" />
                Deposit
              </Button>
              <Button
                onClick={onWithdrawClick}
                variant="outline"
                className="flex-1"
                disabled={balanceData.available_balance === 0}
              >
                <Minus className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            </div>
          </div>

          {/* Invested Balance */}
          <div className="space-y-4">
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <TrendingUp className="h-6 w-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                  Invested Balance
                </h3>
              </div>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {showDetails ? formatCurrency(balanceData.invested_balance) : '••••••'}
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                {balanceData.active_investments_count} active investment{balanceData.active_investments_count !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Invested Balance Actions */}
            <div className="flex space-x-2">
              <Button
                onClick={onInvestClick}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                disabled={balanceData.available_balance === 0}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Invest More
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={balanceData.invested_balance === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </div>
        </div>

        {/* Detailed Balance Information */}
        {showDetails && (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Balance Breakdown
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(balanceData.available_balance)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Available Balance</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(balanceData.total_profit_earned)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Profit Earned</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {balanceData.active_investments_count}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Investments</p>
                </div>
              </div>
            </div>

            {/* Investment Performance */}
            {balanceData.total_invested > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Investment Performance
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Invested:</span>
                    <span className="font-semibold">{formatCurrency(balanceData.total_invested)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Profit:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(balanceData.total_profit_earned)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">ROI:</span>
                    <span className="font-semibold text-green-600">
                      {((balanceData.total_profit_earned / balanceData.total_invested) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Quick Actions
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDepositClick}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Deposit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onWithdrawClick}
              disabled={balanceData.available_balance === 0}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Minus className="h-4 w-4 mr-1" />
              Withdraw
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onInvestClick}
              disabled={balanceData.available_balance === 0}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Invest
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBalanceData}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceManagement;
