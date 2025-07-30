import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowLeft, Wallet, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Withdraw = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchBalance = async () => {
      try {
        // Fetch approved deposits (wallet balance)
        const { data: deposits } = await supabase
          .from('deposits')
          .select('amount')
          .eq('user_id', user.id)
          .eq('status', 'approved');

        // Fetch total earnings
        const { data: earnings } = await supabase
          .from('earnings')
          .select('amount')
          .eq('user_id', user.id);

        // Fetch pending withdrawals
        const { data: withdrawals } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('user_id', user.id)
          .in('status', ['pending', 'processing']);

        const totalDeposits = deposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
        const totalEarnings = earnings?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
        const pendingWithdrawals = withdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;

        setBalance(totalDeposits + totalEarnings - pendingWithdrawals);
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    };

    fetchBalance();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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

    if (withdrawalAmount > balance) {
      toast({
        title: "Insufficient Balance",
        description: `Available balance: $${balance.toFixed(2)} USDT`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
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

      setSubmitted(true);
      
    } catch (error: any) {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to submit withdrawal request.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Withdrawal Request Submitted!</h2>
                <p className="text-muted-foreground">
                  Your withdrawal request has been submitted for processing. You will receive a notification once it's completed.
                </p>
              </div>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ArrowDownLeft className="h-5 w-5" />
                Withdraw Funds
              </span>
              <Badge variant="outline">Min: $10</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Balance Display */}
            <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/5 p-4 rounded-lg border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-2xl font-bold text-blue-600">${balance.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">USDT</p>
                </div>
                <Wallet className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="withdrawAmount">Withdrawal Amount (USDT)</Label>
                <Input
                  id="withdrawAmount"
                  type="number"
                  placeholder="Enter amount (min: $10)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="10"
                  step="0.01"
                  required
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum withdrawal: $10 USDT
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="walletAddress">Destination Wallet Address (TRC20)</Label>
                <Input
                  id="walletAddress"
                  type="text"
                  placeholder="Enter your USDT wallet address"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  required
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Make sure to use the correct TRC20 network address
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Request Withdrawal'}
              </Button>
            </form>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Withdrawals are reviewed and processed within 24–48 hours
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Withdraw; 