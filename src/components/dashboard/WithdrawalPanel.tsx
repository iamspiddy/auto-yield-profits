import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowDownLeft, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const WithdrawalPanel = () => {
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [availableEarnings, setAvailableEarnings] = useState(0);
  const { user } = useAuth();

  // Fetch available earnings on component mount
  React.useEffect(() => {
    const fetchAvailableEarnings = async () => {
      if (!user) return;
      
      try {
        // Fetch total earnings
        const { data: earnings } = await supabase
          .from('earnings')
          .select('amount')
          .eq('user_id', user.id);

        // Get pending earnings withdrawals
        const { data: pendingEarningsWithdrawals } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('user_id', user.id)
          .eq('withdrawal_type', 'earnings')
          .in('status', ['pending', 'processing']);

        const totalEarnings = earnings?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
        const pendingEarningsAmount = pendingEarningsWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
        
        setAvailableEarnings(totalEarnings - pendingEarningsAmount);
      } catch (error) {
        console.error('Error fetching earnings:', error);
      }
    };

    fetchAvailableEarnings();
  }, [user]);

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

    if (withdrawalAmount > availableEarnings) {
      toast({
        title: "Insufficient Earnings",
        description: `Available earnings: $${availableEarnings.toFixed(2)} USDT`,
        variant: "destructive"
      });
      return;
    }

    // Show PIN dialog instead of processing immediately
    setShowPinDialog(true);
  };

  const handlePinVerification = async () => {
    if (!user || !pin) return;

    setLoading(true);

    try {
      // Verify PIN with admin
      const { data: pinVerification, error: pinError } = await supabase
        .rpc('verify_withdrawal_pin', {
          user_id_param: user.id,
          pin_param: pin
        });

      if (pinError || !pinVerification) {
        toast({
          title: "Invalid PIN",
          description: "The PIN you entered is invalid or has expired.",
          variant: "destructive"
        });
        return;
      }

      // PIN is valid, proceed with withdrawal
      const withdrawalAmount = parseFloat(amount);

      // Create withdrawal record
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: withdrawalAmount,
          wallet_address: walletAddress,
          status: 'pending',
          withdrawal_type: 'earnings'
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
          description: `Earnings withdrawal of ${amount} USDT to ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        });

      toast({
        title: "Withdrawal Requested",
        description: "Your earnings withdrawal request has been submitted for processing."
      });

      // Reset form
      setAmount('');
      setWalletAddress('');
      setPin('');
      setShowPinDialog(false);
      
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
            Withdraw Earnings
          </span>
          <Badge variant="outline">Min: $10</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-600 font-medium">Available Earnings</span>
            <span className="text-lg font-bold text-green-600">${availableEarnings.toFixed(2)} USDT</span>
          </div>
        </div>

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
              max={availableEarnings}
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
            • Network: TRC20 (TRON)<br/>
            • You will need a 4-digit PIN from admin to complete withdrawal
          </p>
        </div>
      </CardContent>

      {/* PIN Verification Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Enter Withdrawal PIN
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Please enter the 4-digit PIN provided by admin to complete your withdrawal request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">4-Digit PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={4}
                pattern="[0-9]{4}"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handlePinVerification} 
                className="flex-1"
                disabled={loading || pin.length !== 4}
              >
                {loading ? 'Verifying...' : 'Verify & Submit'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPinDialog(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default WithdrawalPanel;