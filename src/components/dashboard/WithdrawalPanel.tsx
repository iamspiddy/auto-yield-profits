import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const WithdrawalPanel = () => {
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!amount || !walletAddress) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const withdrawalAmount = parseFloat(amount);
    if (withdrawalAmount < 10) {
      toast({
        title: "Minimum Amount",
        description: "Minimum withdrawal amount is $10 USDT.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Check available balance (this is a simplified check)
      const { data: deposits } = await supabase
        .from('deposits')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      const { data: earnings } = await supabase
        .from('earnings')
        .select('amount')
        .eq('user_id', user.id);

      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing', 'completed']);

      const totalDeposits = deposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
      const totalEarnings = earnings?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
      const totalWithdrawals = withdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
      
      const availableBalance = totalDeposits + totalEarnings - totalWithdrawals;

      if (withdrawalAmount > availableBalance) {
        toast({
          title: "Insufficient Balance",
          description: `Available balance: $${availableBalance.toFixed(2)} USDT`,
          variant: "destructive"
        });
        return;
      }

      // Create withdrawal record
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: withdrawalAmount,
          wallet_address: walletAddress,
          status: 'pending'
        });

      if (withdrawalError) throw withdrawalError;

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'withdrawal',
          amount: withdrawalAmount,
          status: 'pending',
          description: `Withdrawal of ${amount} USDT to ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        });

      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal request has been submitted for processing."
      });

      // Reset form
      setAmount('');
      setWalletAddress('');
      
    } catch (error: any) {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to submit withdrawal request.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <ArrowDownLeft className="h-5 w-5 mr-2" />
            Withdraw Funds
          </span>
          <Badge variant="outline">Min: $10</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="withdrawAmount">Withdrawal Amount (USDT)</Label>
            <Input
              id="withdrawAmount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="10"
              step="0.01"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="walletAddress">USDT Wallet Address (TRC20)</Label>
            <Input
              id="walletAddress"
              type="text"
              placeholder="Enter your USDT wallet address"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Processing...' : 'Request Withdrawal'}
          </Button>
        </form>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            • Withdrawals are processed within 24-48 hours<br/>
            • Minimum withdrawal: $10 USDT<br/>
            • Network: TRC20 (TRON)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WithdrawalPanel;