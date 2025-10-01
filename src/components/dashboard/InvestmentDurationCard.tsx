import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  TrendingUp, 
  Target, 
  AlertCircle, 
  CheckCircle, 
  Timer,
  DollarSign,
  Calendar,
  Zap
} from 'lucide-react';
import { InvestmentService, type InvestmentWithPlan } from '@/lib/investmentService';
import { toast } from '@/hooks/use-toast';

interface InvestmentDurationCardProps {
  investment: InvestmentWithPlan;
  onEarlyWithdrawal?: (investmentId: string) => void;
  onReinvest?: (investmentId: string) => void;
}

const InvestmentDurationCard: React.FC<InvestmentDurationCardProps> = ({ 
  investment, 
  onEarlyWithdrawal,
  onReinvest 
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [isMatured, setIsMatured] = useState<boolean>(false);
  const [daysUntilMaturity, setDaysUntilMaturity] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    const updateTimer = () => {
      if (investment.maturity_date) {
        const isMaturedNow = InvestmentService.isInvestmentMatured(investment.maturity_date);
        setIsMatured(isMaturedNow);
        
        if (!isMaturedNow) {
          const days = InvestmentService.getDaysUntilMaturity(investment.maturity_date);
          setDaysUntilMaturity(days);
          
          if (days > 0) {
            const hours = Math.floor((new Date(investment.maturity_date).getTime() - new Date().getTime()) / (1000 * 60 * 60));
            const minutes = Math.floor(((new Date(investment.maturity_date).getTime() - new Date().getTime()) % (1000 * 60 * 60)) / (1000 * 60));
            
            if (days >= 1) {
              setTimeRemaining(`${days} day${days > 1 ? 's' : ''} remaining`);
            } else if (hours > 0) {
              setTimeRemaining(`${hours} hour${hours > 1 ? 's' : ''} remaining`);
            } else {
              setTimeRemaining(`${minutes} minute${minutes > 1 ? 's' : ''} remaining`);
            }
          } else {
            setTimeRemaining('Matured!');
          }
        } else {
          setTimeRemaining('Matured!');
        }
        
        // Calculate progress percentage
        const progress = InvestmentService.calculateInvestmentProgress(
          investment.start_date,
          investment.maturity_date
        );
        setProgressPercentage(progress);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [investment.maturity_date, investment.start_date]);

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'bronze':
        return {
          gradient: 'from-amber-500 to-amber-600',
          bgGradient: 'from-amber-50 to-amber-100',
          borderColor: 'border-amber-300',
          textColor: 'text-amber-800',
          accentColor: 'text-amber-600'
        };
      case 'silver':
        return {
          gradient: 'from-gray-400 to-gray-500',
          bgGradient: 'from-gray-50 to-gray-100',
          borderColor: 'border-gray-300',
          textColor: 'text-gray-800',
          accentColor: 'text-gray-600'
        };
      case 'gold':
        return {
          gradient: 'from-yellow-400 to-yellow-500',
          bgGradient: 'from-yellow-50 to-yellow-100',
          borderColor: 'border-yellow-300',
          textColor: 'text-yellow-800',
          accentColor: 'text-yellow-600'
        };
      case 'diamond':
        return {
          gradient: 'from-blue-400 to-blue-500',
          bgGradient: 'from-blue-50 to-blue-100',
          borderColor: 'border-blue-300',
          textColor: 'text-blue-800',
          accentColor: 'text-blue-600'
        };
      default:
        return {
          gradient: 'from-gray-500 to-gray-600',
          bgGradient: 'from-gray-50 to-gray-100',
          borderColor: 'border-gray-300',
          textColor: 'text-gray-800',
          accentColor: 'text-gray-600'
        };
    }
  };

  const planConfig = getPlanColor(investment.plan.plan_name);
  const earlyWithdrawalAmount = InvestmentService.calculateEarlyWithdrawalAmount(
    investment.current_balance,
    investment.early_withdrawal_penalty_percent
  );

  const handleEarlyWithdrawal = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const result = await InvestmentService.processEarlyWithdrawal(investment.id, user.id);
      
      if (result.success) {
        toast({
          title: "Early Withdrawal Processed",
          description: `You received $${result.withdrawalAmount.toFixed(2)} (${investment.early_withdrawal_penalty_percent}% penalty applied)`,
        });
        
        // Call the parent callback to refresh the investments list
        onEarlyWithdrawal?.(investment.id);
      }
    } catch (error: any) {
      console.error('Error processing early withdrawal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process early withdrawal",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMaturityWithdrawal = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const result = await InvestmentService.processInvestmentMaturity(investment.id, user.id);
      
      if (result.success) {
        toast({
          title: "Investment Matured",
          description: `You received $${result.maturityAmount.toFixed(2)} from your matured investment`,
        });
        
        // Call the parent callback to refresh the investments list
        onEarlyWithdrawal?.(investment.id);
      }
    } catch (error: any) {
      console.error('Error processing maturity withdrawal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process maturity withdrawal",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className={`bg-gradient-to-br ${planConfig.bgGradient} border ${planConfig.borderColor} shadow-lg hover:shadow-xl transition-all duration-300`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-xl font-bold ${planConfig.textColor} flex items-center space-x-2`}>
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${planConfig.gradient}`}></div>
            <span>{investment.plan.plan_name} Plan</span>
          </CardTitle>
          <Badge 
            variant={isMatured ? "default" : "secondary"}
            className={isMatured ? "bg-green-500 text-white" : ""}
          >
            {isMatured ? "Matured" : "Active"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Investment Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <div className="text-lg font-bold text-gray-900">
              ${investment.current_balance.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">Current Balance</div>
          </div>
          
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <Target className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <div className="text-lg font-bold text-gray-900">
              ${investment.projected_maturity_value?.toLocaleString() || 'N/A'}
            </div>
            <div className="text-xs text-gray-600">Maturity Value</div>
          </div>
        </div>

        {/* Duration and Progress */}
        {investment.maturity_date && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Duration: {investment.user_selected_duration_weeks} weeks
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Timer className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {timeRemaining}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Progress</span>
                <span>{progressPercentage.toFixed(1)}%</span>
              </div>
              <Progress 
                value={progressPercentage} 
                className="h-2"
                style={{
                  background: `linear-gradient(90deg, ${planConfig.accentColor} ${progressPercentage}%, #e5e7eb ${progressPercentage}%)`
                }}
              />
            </div>
          </div>
        )}

        {/* Maturity Status */}
        {isMatured ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="font-semibold">Investment Matured!</div>
              <div className="text-sm">
                Your investment has reached maturity. You can now withdraw your funds or reinvest.
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-blue-200 bg-blue-50">
            <Zap className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="font-semibold">Compounding Weekly</div>
              <div className="text-sm">
                Your investment is earning {investment.plan.weekly_profit_percent}% weekly profit.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {isMatured ? (
            <>
              <Button 
                onClick={() => onReinvest?.(investment.id)}
                className={`flex-1 bg-gradient-to-r ${planConfig.gradient} hover:opacity-90 text-white`}
                disabled={isProcessing}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Reinvest
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleMaturityWithdrawal}
                disabled={isProcessing}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Withdraw'}
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleEarlyWithdrawal}
              disabled={isProcessing}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Early Withdrawal'}
              <span className="ml-1 text-xs">
                (${earlyWithdrawalAmount.toFixed(2)})
              </span>
            </Button>
          )}
        </div>

        {/* Investment Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div className="p-2 bg-white/30 rounded">
            <div className="font-semibold text-gray-900">
              ${investment.invested_amount.toLocaleString()}
            </div>
            <div className="text-gray-600">Invested</div>
          </div>
          <div className="p-2 bg-white/30 rounded">
            <div className="font-semibold text-green-600">
              +${investment.total_profit_earned.toLocaleString()}
            </div>
            <div className="text-gray-600">Profit Earned</div>
          </div>
          <div className="p-2 bg-white/30 rounded">
            <div className="font-semibold text-blue-600">
              {investment.plan.weekly_profit_percent}%
            </div>
            <div className="text-gray-600">Weekly Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestmentDurationCard;
