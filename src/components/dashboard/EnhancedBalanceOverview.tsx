import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, Clock, Bitcoin, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCryptoPrice, convertUSDToBTC, formatBTCAmount } from '@/lib/cryptoService';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface BalanceData {
  amountInvested: number;
  totalEarnings: number;
  pendingWithdrawals: number;
}

interface CryptoPrices {
  BTC: number | null;
  ETH: number | null;
}

const EnhancedBalanceOverview = () => {
  const [balanceData, setBalanceData] = useState<BalanceData>({
    amountInvested: 0,
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
  const navigate = useNavigate();

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
        const amountInvested = totalDeposits - totalCompletedWalletWithdrawals;
        
        const totalEarnings = earnings?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
        const pendingWithdrawals = pendingWithdrawalsData?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
        const completedEarningsDeductions = completedEarningsWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;

        setBalanceData({
          amountInvested: amountInvested,
          totalEarnings: totalEarnings - pendingWithdrawals - completedEarningsDeductions,
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
  const amountInvestedBTC = cryptoPrices.BTC ? convertUSDToBTC(balanceData.amountInvested, cryptoPrices.BTC) : 0;
  const totalEarningsBTC = cryptoPrices.BTC ? convertUSDToBTC(balanceData.totalEarnings, cryptoPrices.BTC) : 0;
  const pendingWithdrawalsBTC = cryptoPrices.BTC ? convertUSDToBTC(balanceData.pendingWithdrawals, cryptoPrices.BTC) : 0;

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-1/4"></div>
            <div className="h-8 bg-slate-700 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-20 bg-slate-700 rounded-lg"></div>
              <div className="h-20 bg-slate-700 rounded-lg"></div>
              <div className="h-20 bg-slate-700 rounded-lg"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-white">
          <span className="flex items-center text-xl font-bold">
            <Wallet className="h-6 w-6 mr-3 text-blue-400" />
            Balance Overview
          </span>
          {cryptoLoading && (
            <Badge variant="secondary" className="bg-slate-700 text-slate-300">
              Loading prices...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Amount Invested */}
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-6 rounded-xl border border-blue-500/20 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-blue-200 font-medium">Amount Invested</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(balanceData.amountInvested)}</p>
                <p className="text-xs text-blue-300 mt-1">USDT</p>
                {cryptoPrices.BTC && (
                  <p className="text-xs text-blue-300 mt-1">
                    ≈ {formatBTCAmount(amountInvestedBTC)} BTC
                  </p>
                )}
              </div>
              <div className="bg-blue-500/20 p-3 rounded-full">
                <Wallet className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Earnings */}
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 p-6 rounded-xl border border-green-500/20 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-green-200 font-medium">Total Earnings</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(balanceData.totalEarnings)}</p>
                <p className="text-xs text-green-300 mt-1">USDT</p>
                {cryptoPrices.BTC && (
                  <p className="text-xs text-green-300 mt-1">
                    ≈ {formatBTCAmount(totalEarningsBTC)} BTC
                  </p>
                )}
              </div>
              <div className="bg-green-500/20 p-3 rounded-full">
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </div>
          </div>

          {/* Pending Withdrawals */}
          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 p-6 rounded-xl border border-orange-500/20 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-orange-200 font-medium">Pending Withdrawals</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(balanceData.pendingWithdrawals)}</p>
                <p className="text-xs text-orange-300 mt-1">USDT</p>
                {cryptoPrices.BTC && (
                  <p className="text-xs text-orange-300 mt-1">
                    ≈ {formatBTCAmount(pendingWithdrawalsBTC)} BTC
                  </p>
                )}
              </div>
              <div className="bg-orange-500/20 p-3 rounded-full">
                <Clock className="h-8 w-8 text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedBalanceOverview;
