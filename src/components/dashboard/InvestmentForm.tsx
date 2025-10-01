import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, Calculator, AlertCircle, Clock, Target, Zap } from 'lucide-react';
import { InvestmentService, type InvestmentPlan } from '@/lib/investmentService';
import { BalanceService } from '@/lib/balanceService';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface InvestmentFormProps {
  plan: InvestmentPlan;
  onSuccess: () => void;
  onCancel: () => void;
}

const InvestmentForm: React.FC<InvestmentFormProps> = ({ plan, onSuccess, onCancel }) => {
  const [amount, setAmount] = useState<string>('');
  const [duration, setDuration] = useState<string>('12'); // Default to 3 months
  const [loading, setLoading] = useState(false);
  const [projectedReturns, setProjectedReturns] = useState<{ week: number; balance: number; profit: number }[]>([]);
  const [projectedMaturityValue, setProjectedMaturityValue] = useState<number>(0);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const { user } = useAuth();

  const handleAmountChange = (value: string) => {
    setAmount(value);
    calculateProjections(value, duration);
  };

  const handleDurationChange = (value: string) => {
    setDuration(value);
    calculateProjections(amount, value);
  };

  const calculateProjections = (amountValue: string, durationValue: string) => {
    const numAmount = parseFloat(amountValue);
    const numDuration = parseInt(durationValue);
    
    if (numAmount >= plan.min_amount && numDuration > 0) {
      const projections = InvestmentService.calculateProjectedReturns(
        numAmount,
        plan.weekly_profit_percent,
        numDuration
      );
      setProjectedReturns(projections);
      
      // Calculate projected maturity value
      const maturityValue = InvestmentService.calculateProjectedMaturityValue(
        numAmount,
        plan.weekly_profit_percent,
        numDuration
      );
      setProjectedMaturityValue(maturityValue);
      setTotalProfit(maturityValue - numAmount);
    } else {
      setProjectedReturns([]);
      setProjectedMaturityValue(0);
      setTotalProfit(0);
    }
  };

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!user) return;
      
      try {
        // Use the new balance service to get available balance with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        let balance = null;
        
        while (retryCount < maxRetries) {
          try {
            balance = await BalanceService.getUserBalance(user.id);
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
        
        setWalletBalance(balance?.available || 0);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        // Fallback to old method if balance service fails
        try {
          const { data: deposits } = await supabase
            .from('deposits')
            .select('amount')
            .eq('user_id', user.id)
            .eq('status', 'approved');

          const { data: completedWithdrawals } = await supabase
            .from('withdrawals')
            .select('amount')
            .eq('user_id', user.id)
            .eq('status', 'completed') as any;

          const totalDeposits = deposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
          const totalWithdrawals = completedWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
          const balance = totalDeposits - totalWithdrawals;
          
          setWalletBalance(balance);
        } catch (fallbackError) {
          console.error('Fallback balance fetch failed:', fallbackError);
          setWalletBalance(0);
        }
      }
    };

    fetchWalletBalance();
  }, [user]);

  // Calculate projections when component mounts or values change
  useEffect(() => {
    calculateProjections(amount, duration);
  }, [plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    
    if (numAmount < plan.min_amount) {
      toast({
        title: "Invalid Amount",
        description: `Minimum investment amount is $${plan.min_amount}`,
        variant: "destructive"
      });
      return;
    }

    // Check if user has sufficient funds
    if (numAmount > walletBalance) {
      toast({
        title: "Insufficient Funds",
        description: "You need to deposit first before starting a plan. Click the Deposit button to add funds to your wallet.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Get current user ID from auth context
      const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      await InvestmentService.createInvestment(plan.id, numAmount, user.id, parseInt(duration));
      
      toast({
        title: "Investment Created",
        description: `Successfully invested $${numAmount} in ${plan.plan_name} plan`,
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('Error creating investment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create investment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'bronze':
        return 'bg-amber-500';
      case 'silver':
        return 'bg-gray-400';
      case 'gold':
        return 'bg-yellow-500';
      case 'diamond':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const isValidAmount = parseFloat(amount) >= plan.min_amount;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getPlanColor(plan.plan_name)}`}></div>
          <span>Invest in {plan.plan_name} Plan</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Plan Details */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {plan.weekly_profit_percent}%
            </div>
            <p className="text-sm text-muted-foreground">Weekly Profit</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${plan.min_amount}
            </div>
            <p className="text-sm text-muted-foreground">Minimum Investment</p>
          </div>
        </div>

        {/* Investment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Investment Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Investment Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min={plan.min_amount}
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder={`Minimum: $${plan.min_amount}`}
                  className="pl-10"
                  required
                />
              </div>
              {amount && !isValidAmount && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Minimum investment amount is ${plan.min_amount}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Duration Selection */}
            <div className="space-y-2">
              <Label htmlFor="duration">Investment Duration</Label>
              <Select value={duration} onValueChange={handleDurationChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {InvestmentService.getDurationOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{option.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {option.weeks} weeks
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Live Investment Calculator */}
          {isValidAmount && projectedMaturityValue > 0 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2 mb-4">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Live Investment Calculator
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Projected Maturity Value */}
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
                    <Target className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">
                      ${projectedMaturityValue.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Projected Maturity Value</p>
                  </div>
                  
                  {/* Total Profit */}
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800">
                    <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      +${totalProfit.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Profit</p>
                  </div>
                  
                  {/* ROI Percentage */}
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800">
                    <Calculator className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-600">
                      {((totalProfit / parseFloat(amount)) * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">ROI</p>
                  </div>
                </div>
              </div>

              {/* Weekly Progress Preview */}
              {projectedReturns.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Weekly Growth Preview
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {projectedReturns.filter((_, index) => 
                      [Math.floor(projectedReturns.length * 0.25), 
                       Math.floor(projectedReturns.length * 0.5), 
                       Math.floor(projectedReturns.length * 0.75), 
                       projectedReturns.length - 1]
                      .includes(index)
                    ).map((projection, index) => (
                      <div key={projection.week} className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="font-semibold text-green-600">
                          Week {projection.week}
                        </div>
                        <div className="text-lg font-bold text-green-700">
                          ${projection.balance.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          +${projection.profit.toFixed(2)} profit
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Investment Summary */}
          {isValidAmount && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                <Calculator className="h-4 w-4 mr-2" />
                Investment Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="ml-2 font-semibold">{plan.plan_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="ml-2 font-semibold">${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="ml-2 font-semibold">
                    {InvestmentService.getDurationOptions().find(opt => opt.value.toString() === duration)?.label}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Weekly Profit:</span>
                  <span className="ml-2 font-semibold">{plan.weekly_profit_percent}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">First Week Profit:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    ${((parseFloat(amount) * plan.weekly_profit_percent) / 100).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Maturity Value:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    ${projectedMaturityValue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValidAmount || loading}
              className={`flex-1 ${getPlanColor(plan.plan_name)} hover:opacity-90 text-white`}
            >
              {loading ? 'Creating...' : 'Create Investment'}
            </Button>
          </div>
        </form>

        {/* Terms */}
        <div className="text-xs text-muted-foreground text-center">
          By creating an investment, you agree to our terms and conditions.
          Investments are subject to market risks.
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestmentForm;
