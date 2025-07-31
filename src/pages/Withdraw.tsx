import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowDownLeft, ArrowLeft, TrendingUp, Lock, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Withdraw = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [availableEarnings, setAvailableEarnings] = useState(0);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchAvailableEarnings = async () => {
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

        // Get completed earnings withdrawals (deductions)
        const { data: completedEarningsWithdrawals } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('user_id', user.id)
          .eq('withdrawal_type', 'earnings')
          .eq('status', 'completed');

        const totalEarnings = earnings?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
        const pendingEarningsAmount = pendingEarningsWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
        const completedEarningsDeductions = completedEarningsWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
        
        setAvailableEarnings(totalEarnings - pendingEarningsAmount - completedEarningsDeductions);
      } catch (error) {
        console.error('Error fetching earnings:', error);
      }
    };

    fetchAvailableEarnings();
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

    setIsSubmitting(true);

    try {
      // Verify PIN with admin
      const { data: pinVerification, error: pinError } = await supabase
        .rpc('verify_withdrawal_pin', {
          _user_id: user.id,
          _pin: pin
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

      // Create withdrawal record using raw SQL to avoid type issues
      console.log('Creating withdrawal...');
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .rpc('create_withdrawal', {
          p_user_id: user.id,
          p_amount: withdrawalAmount,
          p_wallet_address: walletAddress,
          p_withdrawal_type: 'earnings'
        });

      if (withdrawalError) {
        console.error('Withdrawal error:', withdrawalError);
        throw withdrawalError;
      }
      console.log('Withdrawal created successfully:', withdrawalData);

      // Transaction is automatically created by the trigger handle_withdrawal_transaction()
      // No need to create it manually to avoid duplicate key violations
      console.log('Withdrawal created successfully, transaction will be created by trigger');

      toast({
        title: "Withdrawal Requested",
        description: "Your earnings withdrawal request has been submitted for processing."
      });

      setSubmitted(true);
      setPin('');
      setShowPinDialog(false);
      
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
                Withdraw Earnings
              </span>
              <Badge variant="outline">Min: $10</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Earnings Display */}
            <div className="bg-gradient-to-r from-green-500/10 to-green-600/5 p-4 rounded-lg border border-green-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Earnings</p>
                  <p className="text-2xl font-bold text-green-600">${availableEarnings.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">USDT</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
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
                  max={availableEarnings}
                  step="0.01"
                  required
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum withdrawal: $10 USDT • Maximum: ${availableEarnings.toFixed(2)} USDT
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
                Withdrawals are reviewed and processed within 24–48 hours<br/>
                You will need a 4-digit PIN from admin to complete withdrawal
              </p>
            </div>
          </CardContent>
        </Card>

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
                  disabled={isSubmitting || pin.length !== 4}
                >
                  {isSubmitting ? 'Verifying...' : 'Verify & Submit'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPinDialog(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Withdraw; 