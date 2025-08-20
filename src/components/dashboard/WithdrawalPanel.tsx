import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownLeft, Lock, CreditCard, Wallet, Banknote, Smartphone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Withdrawal method types
type WithdrawalMethod = 'Bank Transfer' | 'PayPal' | 'Crypto Wallet' | 'Mobile Money';

// Form data interface
interface WithdrawalFormData {
  method: WithdrawalMethod;
  details: Record<string, string>;
}

const WithdrawalPanel = () => {
  const [amount, setAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState<WithdrawalMethod>('Bank Transfer');
  const [formData, setFormData] = useState<WithdrawalFormData>({
    method: 'Bank Transfer',
    details: {
      accountName: '',
      accountNumber: '',
      bankName: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [availableEarnings, setAvailableEarnings] = useState(0);
  const { user } = useAuth();

  // Crypto options
  const cryptoOptions = ['BTC', 'ETH', 'USDT'];

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

  // Update form data when method changes
  React.useEffect(() => {
    const newDetails = getDefaultDetailsForMethod(withdrawalMethod);
    setFormData({
      method: withdrawalMethod,
      details: newDetails
    });
  }, [withdrawalMethod]);

  const getDefaultDetailsForMethod = (method: WithdrawalMethod): Record<string, string> => {
    switch (method) {
      case 'Bank Transfer':
        return { accountName: '', accountNumber: '', bankName: '' };
      case 'PayPal':
        return { paypalEmail: '' };
      case 'Crypto Wallet':
        return { coin: 'USDT', walletAddress: '' };
      case 'Mobile Money':
        return { fullName: '', phoneNumber: '', providerName: '' };
      default:
        return {};
    }
  };

  const getMethodIcon = (method: WithdrawalMethod) => {
    switch (method) {
      case 'Bank Transfer':
        return <Banknote className="h-4 w-4" />;
      case 'PayPal':
        return <CreditCard className="h-4 w-4" />;
      case 'Crypto Wallet':
        return <Wallet className="h-4 w-4" />;
      case 'Mobile Money':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Banknote className="h-4 w-4" />;
    }
  };

  const validateForm = (): boolean => {
    if (!amount || parseFloat(amount) < 10) {
      toast({
        title: "Invalid Amount",
        description: "Minimum withdrawal amount is $10 USDT.",
        variant: "destructive"
      });
      return false;
    }

    if (parseFloat(amount) > availableEarnings) {
      toast({
        title: "Insufficient Earnings",
        description: `Available earnings: $${availableEarnings.toFixed(2)} USDT`,
        variant: "destructive"
      });
      return false;
    }

    // Validate method-specific fields
    const details = formData.details;
    switch (withdrawalMethod) {
      case 'Bank Transfer':
        if (!details.accountName || !details.accountNumber || !details.bankName) {
          toast({
            title: "Missing Information",
            description: "Please fill in all bank transfer details.",
            variant: "destructive"
          });
          return false;
        }
        break;
      case 'PayPal':
        if (!details.paypalEmail || !details.paypalEmail.includes('@')) {
          toast({
            title: "Invalid PayPal Email",
            description: "Please enter a valid PayPal email address.",
            variant: "destructive"
          });
          return false;
        }
        break;
      case 'Crypto Wallet':
        if (!details.walletAddress || details.walletAddress.length < 10) {
          toast({
            title: "Invalid Wallet Address",
            description: "Please enter a valid cryptocurrency wallet address.",
            variant: "destructive"
          });
          return false;
        }
        break;
      case 'Mobile Money':
        if (!details.fullName || !details.phoneNumber || !details.providerName) {
          toast({
            title: "Missing Information",
            description: "Please fill in all mobile money details.",
            variant: "destructive"
          });
          return false;
        }
        break;
    }

    return true;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!validateForm()) {
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

      // Prepare withdrawal payload
      const withdrawalPayload = {
        method: formData.method,
        details: formData.details,
        pin: pin
      };

      console.log('Withdrawal payload:', withdrawalPayload);

      // Create withdrawal record
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: withdrawalAmount,
          wallet_address: JSON.stringify(withdrawalPayload), // Store the full payload
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
          description: `${formData.method} withdrawal of ${amount} USDT`
        });

      toast({
        title: "Withdrawal Requested",
        description: `Your ${formData.method} withdrawal request has been submitted for processing.`
      });

      // Reset form
      setAmount('');
      setFormData({
        method: 'Bank Transfer',
        details: { accountName: '', accountNumber: '', bankName: '' }
      });
      setPin('');
      setShowPinDialog(false);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit withdrawal request.";
      toast({
        title: "Withdrawal Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderMethodFields = () => {
    const details = formData.details;
    
    switch (withdrawalMethod) {
      case 'Bank Transfer':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                type="text"
                placeholder="Enter account holder name"
                value={details.accountName || ''}
                onChange={(e) => handleInputChange('accountName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                type="text"
                placeholder="Enter account number"
                value={details.accountNumber || ''}
                onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                type="text"
                placeholder="Enter bank name"
                value={details.bankName || ''}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                required
              />
            </div>
          </div>
        );

      case 'PayPal':
        return (
          <div className="space-y-2">
            <Label htmlFor="paypalEmail">PayPal Email</Label>
            <Input
              id="paypalEmail"
              type="email"
              placeholder="Enter your PayPal email address"
              value={details.paypalEmail || ''}
              onChange={(e) => handleInputChange('paypalEmail', e.target.value)}
              required
            />
          </div>
        );

      case 'Crypto Wallet':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="coin">Cryptocurrency</Label>
              <Select
                value={details.coin || 'USDT'}
                onValueChange={(value) => handleInputChange('coin', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cryptocurrency" />
                </SelectTrigger>
                <SelectContent>
                  {cryptoOptions.map((coin) => (
                    <SelectItem key={coin} value={coin}>
                      {coin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="walletAddress">Wallet Address</Label>
              <Input
                id="walletAddress"
                type="text"
                placeholder={`Enter your ${details.coin || 'USDT'} wallet address`}
                value={details.walletAddress || ''}
                onChange={(e) => handleInputChange('walletAddress', e.target.value)}
                required
              />
            </div>
          </div>
        );

      case 'Mobile Money':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={details.fullName || ''}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Enter your phone number"
                value={details.phoneNumber || ''}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerName">Provider Name</Label>
              <Input
                id="providerName"
                type="text"
                placeholder="e.g., M-Pesa, Airtel Money, etc."
                value={details.providerName || ''}
                onChange={(e) => handleInputChange('providerName', e.target.value)}
                required
              />
            </div>
          </div>
        );

      default:
        return null;
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
          {/* Withdrawal Method Selection */}
          <div className="space-y-2">
            <Label htmlFor="withdrawalMethod">Withdrawal Method</Label>
            <Select
              value={withdrawalMethod}
              onValueChange={(value: WithdrawalMethod) => setWithdrawalMethod(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select withdrawal method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bank Transfer">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Bank Transfer
                  </div>
                </SelectItem>
                <SelectItem value="PayPal">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    PayPal
                  </div>
                </SelectItem>
                <SelectItem value="Crypto Wallet">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Crypto Wallet
                  </div>
                </SelectItem>
                <SelectItem value="Mobile Money">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Mobile Money
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Method-specific fields */}
          <div className="p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              {getMethodIcon(withdrawalMethod)}
              <span className="text-sm font-medium">{withdrawalMethod} Details</span>
            </div>
            {renderMethodFields()}
          </div>

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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Processing...' : 'Request Withdrawal'}
          </Button>
        </form>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            • Withdrawals are processed within 24-48 hours<br/>
            • Minimum withdrawal: $10 USDT<br/>
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
              Please enter the 4-digit PIN provided by admin to complete your {formData.method} withdrawal request.
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