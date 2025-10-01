import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, Clock, ArrowUpRight, Target, Sparkles } from 'lucide-react';
import { InvestmentService, type InvestmentWithPlan } from '@/lib/investmentService';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ActiveInvestmentPlan = () => {
  const [activeInvestment, setActiveInvestment] = useState<InvestmentWithPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchActiveInvestment = async () => {
      try {
        const investments = await InvestmentService.getUserInvestments(user.id);
        const active = investments.find(inv => inv.status === 'active');
        setActiveInvestment(active || null);
      } catch (error) {
        console.error('Error fetching active investment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveInvestment();

    // Listen for refresh events
    const handleRefresh = () => {
      fetchActiveInvestment();
    };

    window.addEventListener('dashboard-refresh', handleRefresh);

    return () => {
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [user]);

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'bronze':
        return {
          bg: 'from-amber-500/20 to-amber-600/10',
          border: 'border-amber-500/30',
          text: 'text-amber-200',
          accent: 'text-amber-400',
          badge: 'bg-amber-500',
          icon: 'text-amber-400'
        };
      case 'silver':
        return {
          bg: 'from-gray-500/20 to-gray-600/10',
          border: 'border-gray-500/30',
          text: 'text-gray-200',
          accent: 'text-gray-400',
          badge: 'bg-gray-500',
          icon: 'text-gray-400'
        };
      case 'gold':
        return {
          bg: 'from-yellow-500/20 to-yellow-600/10',
          border: 'border-yellow-500/30',
          text: 'text-yellow-200',
          accent: 'text-yellow-400',
          badge: 'bg-yellow-500',
          icon: 'text-yellow-400'
        };
      case 'diamond':
        return {
          bg: 'from-blue-500/20 to-blue-600/10',
          border: 'border-blue-500/30',
          text: 'text-blue-200',
          accent: 'text-blue-400',
          badge: 'bg-blue-500',
          icon: 'text-blue-400'
        };
      default:
        return {
          bg: 'from-slate-500/20 to-slate-600/10',
          border: 'border-slate-500/30',
          text: 'text-slate-200',
          accent: 'text-slate-400',
          badge: 'bg-slate-500',
          icon: 'text-slate-400'
        };
    }
  };

  const getDaysUntilNextPayout = (nextCompoundDate: string) => {
    const now = new Date();
    const nextDate = new Date(nextCompoundDate);
    const diffTime = nextDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-700 rounded w-1/3"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-slate-700 rounded"></div>
              <div className="h-16 bg-slate-700 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeInvestment) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-white">
            <Target className="h-6 w-6 mr-3 text-slate-400" />
            My Active Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No Active Investment Yet
            </h3>
            <p className="text-slate-400 mb-6">
              Choose an investment plan to start earning weekly compound profits
            </p>
            <Button 
              onClick={() => navigate('/investments')}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 text-lg font-semibold shadow-lg"
            >
              <ArrowUpRight className="h-5 w-5 mr-2" />
              View Investment Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const planColors = getPlanColor(activeInvestment.plan.plan_name);
  const daysUntilPayout = getDaysUntilNextPayout(activeInvestment.next_compound_date);

  return (
    <Card className={`bg-gradient-to-br ${planColors.bg} border ${planColors.border} shadow-xl`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-white">
          <span className="flex items-center text-xl font-bold">
            <Target className="h-6 w-6 mr-3" style={{ color: planColors.icon }} />
            My Active Plan
          </span>
          <Badge className={`${planColors.badge} text-white font-semibold px-3 py-1`}>
            {activeInvestment.plan.plan_name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Plan Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4" style={{ color: planColors.accent }} />
                <span className="text-sm font-medium" style={{ color: planColors.text }}>
                  Weekly Profit
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {activeInvestment.plan.weekly_profit_percent}%
              </p>
            </div>

            <div className="bg-black/20 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4" style={{ color: planColors.accent }} />
                <span className="text-sm font-medium" style={{ color: planColors.text }}>
                  Amount Invested
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {InvestmentService.formatCurrency(activeInvestment.invested_amount)}
              </p>
            </div>
          </div>

          {/* Current Balance */}
          <div className="bg-black/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: planColors.text }}>
                  Current Balance
                </p>
                <p className="text-3xl font-bold text-white">
                  {InvestmentService.formatCurrency(activeInvestment.current_balance)}
                </p>
                <p className="text-sm" style={{ color: planColors.accent }}>
                  +{InvestmentService.formatCurrency(activeInvestment.total_profit_earned)} profit earned
                </p>
              </div>
              <div className="text-right">
                <div className="bg-green-500/20 p-3 rounded-full mb-2">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Next Payout */}
          <div className="bg-black/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5" style={{ color: planColors.accent }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: planColors.text }}>
                    Next Payout
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {daysUntilPayout} day{daysUntilPayout !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm" style={{ color: planColors.accent }}>
                  {new Date(activeInvestment.next_compound_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Invest Button */}
          <Button 
            onClick={() => navigate('/investments')}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 text-lg font-semibold shadow-lg"
          >
            <ArrowUpRight className="h-5 w-5 mr-2" />
            Quick Invest
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveInvestmentPlan;
