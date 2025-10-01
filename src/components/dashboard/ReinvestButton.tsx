import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  TrendingUp, 
  DollarSign,
  Clock,
  Zap,
  CheckCircle
} from 'lucide-react';
import { InvestmentService, type InvestmentWithPlan } from '@/lib/investmentService';
import { BalanceService } from '@/lib/balanceService';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ReinvestButtonProps {
  investment: InvestmentWithPlan;
  onReinvestSuccess: () => void;
}

const ReinvestButton: React.FC<ReinvestButtonProps> = ({
  investment,
  onReinvestSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const { user } = useAuth();

  const maturityAmount = investment.current_balance;
  const originalAmount = investment.invested_amount;
  const profitEarned = maturityAmount - originalAmount;

  const handleReinvest = async (planId: string, amount: number, durationWeeks: number) => {
    if (!user) return;

    setLoading(true);
    
    try {
      // Check if user has sufficient balance
      const hasBalance = await BalanceService.hasSufficientBalance(user.id, amount);
      if (!hasBalance) {
        toast({
          title: "Insufficient Balance",
          description: "You don't have enough funds to make this investment.",
          variant: "destructive"
        });
        return;
      }

      // Create new investment
      const newInvestment = await InvestmentService.createInvestment(
        planId,
        amount,
        user.id,
        durationWeeks
      );

      if (newInvestment) {
        toast({
          title: "Reinvestment Successful",
          description: `Successfully reinvested ${InvestmentService.formatCurrency(amount)} in a new plan.`,
        });
        onReinvestSuccess();
      }
    } catch (error: any) {
      console.error('Error creating reinvestment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create reinvestment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setShowOptions(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const reinvestmentOptions = [
    {
      planId: investment.plan.id,
      amount: maturityAmount,
      label: 'Full Amount',
      description: `Reinvest all ${formatCurrency(maturityAmount)}`,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      planId: investment.plan.id,
      amount: originalAmount,
      label: 'Original Amount',
      description: `Reinvest ${formatCurrency(originalAmount)} (keep ${formatCurrency(profitEarned)} profit)`,
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      planId: investment.plan.id,
      amount: profitEarned,
      label: 'Profit Only',
      description: `Reinvest ${formatCurrency(profitEarned)} profit`,
      color: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  if (loading) {
    return (
      <Button disabled className="w-full">
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        Processing Reinvestment...
      </Button>
    );
  }

  if (showOptions) {
    return (
      <div className="space-y-3">
        <div className="text-center">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            Choose Reinvestment Amount
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select how much you want to reinvest from your matured investment.
          </p>
        </div>
        
        <div className="space-y-2">
          {reinvestmentOptions.map((option, index) => (
            <Button
              key={index}
              onClick={() => handleReinvest(option.planId, option.amount, 12)}
              className={`w-full ${option.color} text-white`}
              disabled={option.amount <= 0}
            >
              <div className="text-left">
                <div className="font-semibold">{option.label}</div>
                <div className="text-xs opacity-90">{option.description}</div>
              </div>
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={() => setShowOptions(false)}
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Maturity Summary */}
      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center space-x-2 mb-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-green-900 dark:text-green-100">
            Investment Matured!
          </span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-green-700 dark:text-green-300">Original Investment:</span>
            <span className="font-semibold">{formatCurrency(originalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-700 dark:text-green-300">Profit Earned:</span>
            <span className="font-semibold text-green-600">+{formatCurrency(profitEarned)}</span>
          </div>
          <div className="flex justify-between border-t border-green-200 dark:border-green-700 pt-1">
            <span className="text-green-900 dark:text-green-100 font-semibold">Total Maturity:</span>
            <span className="font-bold text-green-600">{formatCurrency(maturityAmount)}</span>
          </div>
        </div>
      </div>

      {/* Reinvest Button */}
      <Button
        onClick={() => setShowOptions(true)}
        className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
      >
        <Zap className="h-4 w-4 mr-2" />
        Reinvest Funds
      </Button>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(originalAmount)}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Original</div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="font-semibold text-green-600">
            {formatCurrency(profitEarned)}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Profit</div>
        </div>
      </div>
    </div>
  );
};

export default ReinvestButton;
