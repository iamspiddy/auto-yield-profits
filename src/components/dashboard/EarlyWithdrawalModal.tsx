import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  TrendingDown,
  X,
  CheckCircle
} from 'lucide-react';
import { InvestmentService, type InvestmentWithPlan } from '@/lib/investmentService';
import { toast } from '@/hooks/use-toast';

interface EarlyWithdrawalModalProps {
  investment: InvestmentWithPlan;
  onClose: () => void;
  onSuccess: () => void;
}

const EarlyWithdrawalModal: React.FC<EarlyWithdrawalModalProps> = ({
  investment,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const penaltyPercent = investment.early_withdrawal_penalty_percent;
  const currentBalance = investment.current_balance;
  const penaltyAmount = currentBalance * (penaltyPercent / 100);
  const withdrawalAmount = currentBalance - penaltyAmount;

  const handleEarlyWithdrawal = async () => {
    if (!confirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that you understand the penalty before proceeding.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const result = await InvestmentService.processEarlyWithdrawal(
        investment.id,
        investment.user_id
      );

      if (result.success) {
        toast({
          title: "Early Withdrawal Processed",
          description: `You received ${InvestmentService.formatCurrency(result.withdrawalAmount)} after a ${penaltyPercent}% penalty.`,
        });
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error('Error processing early withdrawal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process early withdrawal",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  const getDaysUntilMaturity = () => {
    if (!investment.maturity_date) return 0;
    const maturity = new Date(investment.maturity_date);
    const now = new Date();
    const diffTime = maturity.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysUntilMaturity = getDaysUntilMaturity();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Early Withdrawal</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Early withdrawal will apply a {penaltyPercent}% penalty to your investment.
            </AlertDescription>
          </Alert>

          {/* Investment Details */}
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Investment Details
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                  <Badge variant="outline">{investment.plan.plan_name}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Current Balance:</span>
                  <span className="font-semibold">{formatCurrency(currentBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Days Until Maturity:</span>
                  <span className="font-semibold text-blue-600">{daysUntilMaturity} days</span>
                </div>
              </div>
            </div>

            {/* Withdrawal Calculation */}
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-3">
                Withdrawal Calculation
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-orange-700 dark:text-orange-300">Current Balance:</span>
                  <span className="font-semibold">{formatCurrency(currentBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700 dark:text-orange-300">Penalty ({penaltyPercent}%):</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(penaltyAmount)}</span>
                </div>
                <div className="border-t border-orange-200 dark:border-orange-700 pt-2">
                  <div className="flex justify-between">
                    <span className="text-orange-900 dark:text-orange-100 font-semibold">You Will Receive:</span>
                    <span className="font-bold text-green-600 text-lg">{formatCurrency(withdrawalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Loss Information */}
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="font-semibold text-red-900 dark:text-red-100">
                  You Will Lose
                </span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(penaltyAmount)}
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                This amount will be forfeited as an early withdrawal penalty.
              </p>
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="confirm-withdrawal"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="confirm-withdrawal" className="text-sm text-gray-700 dark:text-gray-300">
                I understand that I will lose {formatCurrency(penaltyAmount)} ({penaltyPercent}% penalty) 
                and receive only {formatCurrency(withdrawalAmount)} from my investment of {formatCurrency(investment.invested_amount)}.
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEarlyWithdrawal}
                disabled={!confirmed || loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Withdraw Early
                  </>
                )}
              </Button>
            </div>

            {/* Additional Information */}
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              <p>
                By proceeding, you agree to forfeit {formatCurrency(penaltyAmount)} as an early withdrawal penalty.
                This action cannot be undone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EarlyWithdrawalModal;
