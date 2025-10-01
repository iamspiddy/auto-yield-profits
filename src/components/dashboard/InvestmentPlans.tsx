import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, DollarSign, Clock, Star, ArrowRight, Crown, Gem, Medal, Award } from 'lucide-react';
import { InvestmentService, type InvestmentPlan, type InvestmentWithPlan } from '@/lib/investmentService';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface InvestmentPlansProps {
  onSelectPlan: (plan: InvestmentPlan) => void;
}

const InvestmentPlans: React.FC<InvestmentPlansProps> = ({ onSelectPlan }) => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [userInvestments, setUserInvestments] = useState<InvestmentWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansData, investmentsData] = await Promise.all([
          InvestmentService.getInvestmentPlans(),
          user ? InvestmentService.getUserInvestments(user.id) : Promise.resolve([])
        ]);
        setPlans(plansData);
        setUserInvestments(investmentsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load investment plans",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleInvestClick = (plan: InvestmentPlan) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    onSelectPlan(plan);
  };

  const isCurrentPlan = (planId: string) => {
    return userInvestments.some(inv => inv.plan_id === planId && inv.status === 'active');
  };

  const getPlanConfig = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'bronze':
        return {
          gradient: 'from-amber-600 via-amber-500 to-amber-700',
          bgGradient: 'from-amber-50/10 to-amber-100/5',
          borderColor: 'border-amber-500/30',
          textColor: 'text-amber-200',
          accentColor: 'text-amber-400',
          icon: Medal,
          emoji: '🥉',
          glow: 'shadow-amber-500/20'
        };
      case 'silver':
        return {
          gradient: 'from-gray-400 via-gray-300 to-gray-500',
          bgGradient: 'from-gray-50/10 to-gray-100/5',
          borderColor: 'border-gray-400/30',
          textColor: 'text-gray-200',
          accentColor: 'text-gray-400',
          icon: Award,
          emoji: '🥈',
          glow: 'shadow-gray-400/20'
        };
      case 'gold':
        return {
          gradient: 'from-yellow-400 via-yellow-300 to-yellow-500',
          bgGradient: 'from-yellow-50/10 to-yellow-100/5',
          borderColor: 'border-yellow-400/30',
          textColor: 'text-yellow-200',
          accentColor: 'text-yellow-400',
          icon: Crown,
          emoji: '🥇',
          glow: 'shadow-yellow-400/20'
        };
      case 'diamond':
        return {
          gradient: 'from-blue-400 via-cyan-300 to-blue-500',
          bgGradient: 'from-blue-50/10 to-cyan-100/5',
          borderColor: 'border-blue-400/30',
          textColor: 'text-blue-200',
          accentColor: 'text-blue-400',
          icon: Gem,
          emoji: '💎',
          glow: 'shadow-blue-400/20'
        };
      default:
        return {
          gradient: 'from-gray-500 via-gray-400 to-gray-600',
          bgGradient: 'from-gray-50/10 to-gray-100/5',
          borderColor: 'border-gray-500/30',
          textColor: 'text-gray-200',
          accentColor: 'text-gray-400',
          icon: Star,
          emoji: '⭐',
          glow: 'shadow-gray-500/20'
        };
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="h-8 bg-slate-700 rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2 mx-auto"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-slate-800 border-slate-700 animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-6 bg-slate-700 rounded w-1/2"></div>
                  <div className="h-8 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-full"></div>
                  <div className="h-10 bg-slate-700 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Investment Plans
          </h2>
          <p className="text-slate-300 text-lg">
            Choose your investment plan and start earning weekly compound profits
          </p>
        </div>

        {/* Investment Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const config = getPlanConfig(plan.plan_name);
            const IconComponent = config.icon;
            const isCurrent = isCurrentPlan(plan.id);
            
            return (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} shadow-xl ${config.glow} group`}
              >
                {/* Current Plan Badge */}
                {isCurrent && (
                  <div className="absolute top-4 left-4 z-10">
                    <Badge className="bg-green-500 text-white font-semibold px-3 py-1">
                      Current Plan
                    </Badge>
                  </div>
                )}

                {/* Plan Icon */}
                <div className="absolute top-4 right-4 z-10">
                  <div className={`bg-gradient-to-r ${config.gradient} p-2 rounded-full shadow-lg`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                </div>

                <CardContent className="p-6 pt-8">
                  {/* Plan Name */}
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-2xl">{config.emoji}</span>
                      <h3 className="text-2xl font-bold text-white">
                        {plan.plan_name}
                      </h3>
                    </div>
                    <div className={`w-16 h-1 bg-gradient-to-r ${config.gradient} rounded-full mx-auto`}></div>
                  </div>

                  {/* Weekly Profit */}
                  <div className="text-center mb-6">
                    <div className={`text-4xl font-bold ${config.accentColor} mb-2`}>
                      {plan.weekly_profit_percent}%
                    </div>
                    <p className={`text-sm ${config.textColor} font-medium`}>
                      Weekly Profit
                    </p>
                  </div>

                  {/* Minimum Investment */}
                  <div className="text-center mb-6">
                    <div className="text-2xl font-bold text-white mb-1">
                      ${plan.min_amount.toLocaleString()}
                    </div>
                    <p className={`text-sm ${config.textColor}`}>
                      Minimum Investment
                    </p>
                  </div>

                  {/* Duration Options */}
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Clock className={`h-4 w-4 ${config.accentColor}`} />
                      <span className={`text-sm font-medium ${config.textColor}`}>
                        Choose Duration
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className={`p-1 rounded ${config.bgGradient} border ${config.borderColor}`}>
                        <div className="font-semibold">1 Month</div>
                        <div className="text-xs opacity-75">4 weeks</div>
                      </div>
                      <div className={`p-1 rounded ${config.bgGradient} border ${config.borderColor}`}>
                        <div className="font-semibold">3 Months</div>
                        <div className="text-xs opacity-75">12 weeks</div>
                      </div>
                      <div className={`p-1 rounded ${config.bgGradient} border ${config.borderColor}`}>
                        <div className="font-semibold">6 Months</div>
                        <div className="text-xs opacity-75">24 weeks</div>
                      </div>
                      <div className={`p-1 rounded ${config.bgGradient} border ${config.borderColor}`}>
                        <div className="font-semibold">12 Months</div>
                        <div className="text-xs opacity-75">48 weeks</div>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className={`h-4 w-4 ${config.accentColor}`} />
                      <span className={`text-sm ${config.textColor}`}>Weekly Compounding</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className={`h-4 w-4 ${config.accentColor}`} />
                      <span className={`text-sm ${config.textColor}`}>Guaranteed Returns</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Star className={`h-4 w-4 ${config.accentColor}`} />
                      <span className={`text-sm ${config.textColor}`}>Premium Support</span>
                    </div>
                  </div>

                  {/* Invest Button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={() => handleInvestClick(plan)}
                          className={`w-full bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white font-semibold py-3 text-lg shadow-lg transition-all duration-300 hover:shadow-xl group-hover:scale-105`}
                          disabled={isCurrent}
                        >
                          {isCurrent ? (
                            <>
                              <Crown className="h-5 w-5 mr-2" />
                              Current Plan
                            </>
                          ) : (
                            <>
                              <ArrowRight className="h-5 w-5 mr-2" />
                              Invest Now
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Minimum: ${plan.min_amount} | Weekly Profit: {plan.weekly_profit_percent}% compounded</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* How It Works Section */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl border border-slate-700 shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Choose Plan</h4>
              <p className="text-slate-300">Select an investment plan that fits your budget and goals</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Invest</h4>
              <p className="text-slate-300">Make your investment and start earning immediately</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Earn Weekly</h4>
              <p className="text-slate-300">Receive compound profits every 7 days automatically</p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default InvestmentPlans;
