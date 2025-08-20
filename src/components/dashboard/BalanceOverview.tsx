import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, Clock, ShieldCheck, ShieldAlert, Bitcoin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCryptoPrice, convertUSDToBTC, formatBTCAmount } from '@/lib/cryptoService';

interface BalanceData {
  walletBalance: number;
  totalEarnings: number;
  pendingWithdrawals: number;
}

interface CryptoPrices {
  BTC: number | null;
  ETH: number | null;
}

const BalanceOverview = () => {
  const [balanceData, setBalanceData] = useState<BalanceData>({
    walletBalance: 0,
    totalEarnings: 0,
    pendingWithdrawals: 0
  });
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({
    BTC: null,
    ETH: null
  });
  const [loading, setLoading] = useState(true);
  const [cryptoLoading, setCryptoLoading] = useState(true);
  const { user } = useAuth();

  // Fetch crypto prices
  useEffect(() => {
    const fetchPrices = async () => {
      setCryptoLoading(true);
      try {
        const [btcPrice, ethPrice] = await Promise.all([
          fetchCryptoPrice('bitcoin'),
          fetchCryptoPrice('ethereum')
        ]);
        
        setCryptoPrices({
          BTC: btcPrice?.price || null,
          ETH: ethPrice?.price || null
        });
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
      } finally {
        setCryptoLoading(false);
      }
    };

    fetchPrices();
    
    // Refresh prices every 5 minutes
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchBalanceData = async () => {
      try {
        // Fetch approved deposits only (wallet balance = deposited funds only)
        const { data: deposits } = await supabase
          .from('deposits')
          .select('amount')
          .eq('user_id', user.id)
          .eq('status', 'approved');

        // Fetch total earnings (distributed profits)
        const { data: earnings } = await supabase
          .from('earnings')
          .select('amount')
          .eq('user_id', user.id);

        // Fetch completed withdrawals to subtract from deposited amount (only wallet withdrawals)
        const { data: completedWalletWithdrawals } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .eq('withdrawal_type', 'wallet');

        // Fetch pending withdrawals
        const { data: pendingWithdrawalsData } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('user_id', user.id)
          .in('status', ['pending', 'processing']);

        // Fetch completed earnings withdrawals (deductions)
        const { data: completedEarningsWithdrawals } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .eq('withdrawal_type', 'earnings');

        // Calculate wallet balance: deposited funds only (affected only by wallet withdrawals)
        const totalDeposits = deposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
        const totalCompletedWalletWithdrawals = completedWalletWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
        const walletBalance = totalDeposits - totalCompletedWalletWithdrawals;
        
        const totalEarnings = earnings?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
        const pendingWithdrawals = pendingWithdrawalsData?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
        const completedEarningsDeductions = completedEarningsWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;

        setBalanceData({
          walletBalance: walletBalance,  // Wallet balance should not be affected by pending withdrawals
          totalEarnings: totalEarnings - pendingWithdrawals - completedEarningsDeductions,  // Subtract both pending and completed earnings withdrawals
          pendingWithdrawals
        });
      } catch (error) {
        console.error('Error fetching balance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalanceData();
    
    // Set up real-time subscription for profile changes
    const channel = supabase
      .channel('profile-changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        }, 
        () => {
          // Refresh data when profile is updated
          fetchBalanceData();
        }
      )
      .subscribe();

    // Listen for manual refresh events
    const handleRefresh = () => {
      fetchBalanceData();
    };

    window.addEventListener('dashboard-refresh', handleRefresh);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [user]);

  // Calculate BTC equivalents
  const walletBalanceBTC = cryptoPrices.BTC ? convertUSDToBTC(balanceData.walletBalance, cryptoPrices.BTC) : 0;
  const totalEarningsBTC = cryptoPrices.BTC ? convertUSDToBTC(balanceData.totalEarnings, cryptoPrices.BTC) : 0;
  const pendingWithdrawalsBTC = cryptoPrices.BTC ? convertUSDToBTC(balanceData.pendingWithdrawals, cryptoPrices.BTC) : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Wallet className="h-5 w-5 mr-2" />
            Balance Overview
          </span>
          {cryptoLoading && (
            <Badge variant="secondary" className="text-xs">
              Loading prices...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-2xl font-bold">${balanceData.walletBalance.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">USDT</p>
                {cryptoPrices.BTC && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ {formatBTCAmount(walletBalanceBTC)} BTC
                  </p>
                )}
              </div>
              <Wallet className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-blue-600">${balanceData.totalEarnings.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">USDT</p>
                {cryptoPrices.BTC && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ {formatBTCAmount(totalEarningsBTC)} BTC
                  </p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Earnings in BTC</p>
                <p className="text-2xl font-bold text-amber-600">
                  {cryptoPrices.BTC ? formatBTCAmount(totalEarningsBTC) : 'Loading...'}
                </p>
                <p className="text-xs text-muted-foreground">BTC</p>
              </div>
              <Bitcoin className="h-8 w-8 text-amber-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Withdrawals</p>
                <p className="text-2xl font-bold text-orange-600">${balanceData.pendingWithdrawals.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">USDT</p>
                {cryptoPrices.BTC && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ {formatBTCAmount(pendingWithdrawalsBTC)} BTC
                  </p>
                )}
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceOverview;