import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  Target, 
  DollarSign,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { InvestmentService } from '@/lib/investmentService';
import { formatCurrency } from '@/lib/utils';

interface InvestmentData {
  id: string;
  plan_name: string;
  invested_amount: number;
  current_balance: number;
  total_profit_earned: number;
  start_date: string;
  next_compound_date: string;
  weekly_profit_percent: number;
  status: string;
}

interface ChartDataPoint {
  week: number;
  balance: number;
  profit: number;
  date: string;
  plan?: string;
}


const EarningsTracker = () => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<InvestmentData[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');

  // Investment plans data
  const investmentPlans = [
    { name: 'Bronze', weeklyRate: 10, color: '#CD7F32', minAmount: 200 },
    { name: 'Silver', weeklyRate: 20, color: '#C0C0C0', minAmount: 400 },
    { name: 'Gold', weeklyRate: 40, color: '#FFD700', minAmount: 800 },
    { name: 'Diamond', weeklyRate: 50, color: '#B9F2FF', minAmount: 1200 }
  ];

  // Fetch user investments
  useEffect(() => {
    if (!user) return;

    const fetchInvestments = async () => {
      try {
        setLoading(true);
        const investmentsData = await InvestmentService.getUserInvestments(user.id);
        
        // Transform data for our component
        const transformedData = investmentsData.map(inv => ({
          id: inv.id,
          plan_name: inv.plan.plan_name,
          invested_amount: inv.invested_amount,
          current_balance: inv.current_balance,
          total_profit_earned: inv.total_profit_earned,
          start_date: inv.start_date,
          next_compound_date: inv.next_compound_date,
          weekly_profit_percent: inv.plan.weekly_profit_percent,
          status: inv.status
        }));

        setInvestments(transformedData);
        generateChartData(transformedData);
      } catch (error) {
        console.error('Error fetching investments:', error);
        // Generate sample data for demonstration
        generateSampleData();
      } finally {
        setLoading(false);
      }
    };

    fetchInvestments();
  }, [user]);

  // Generate chart data from investments
  const generateChartData = (investmentData: InvestmentData[]) => {
    if (!investmentData || investmentData.length === 0) {
      generateSampleData();
      return;
    }

    const data: ChartDataPoint[] = [];
    const weeksToShow = viewMode === 'weekly' ? 12 : 52;
    
    investmentData.forEach(investment => {
      if (!investment || investment.status !== 'active') return;
      
      try {
        const startDate = new Date(investment.start_date);
        const weeklyRate = (investment.weekly_profit_percent || 0) / 100;
        const investedAmount = investment.invested_amount || 0;
        
        for (let week = 0; week <= weeksToShow; week++) {
          const balance = investedAmount * Math.pow(1 + weeklyRate, week);
          const profit = balance - investedAmount;
          
          data.push({
            week,
            balance: Math.round(balance * 100) / 100,
            profit: Math.round(profit * 100) / 100,
            date: new Date(startDate.getTime() + week * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            plan: investment.plan_name || 'Unknown'
          });
        }
      } catch (error) {
        console.error('Error processing investment data:', error);
      }
    });

    setChartData(data);
  };

  // Generate sample data for demonstration
  const generateSampleData = () => {
    const sampleData: ChartDataPoint[] = [];
    const weeksToShow = viewMode === 'weekly' ? 12 : 52;
    const sampleInvestment = {
      invested_amount: 1000,
      weekly_profit_percent: 40, // Gold plan
      plan_name: 'Gold'
    };

    for (let week = 0; week <= weeksToShow; week++) {
      const balance = sampleInvestment.invested_amount * Math.pow(1 + sampleInvestment.weekly_profit_percent / 100, week);
      const profit = balance - sampleInvestment.invested_amount;
      
      sampleData.push({
        week,
        balance: Math.round(balance * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        date: new Date(Date.now() + week * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        plan: sampleInvestment.plan_name
      });
    }

    setChartData(sampleData);
  };


  // Get plan color
  const getPlanColor = (planName: string) => {
    const plan = investmentPlans.find(p => p.name === planName);
    return plan?.color || '#3B82F6';
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const balanceValue = payload[0]?.value || 0;
      const profitValue = payload[1]?.value || 0;
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">Week {label}</p>
          <p className="text-green-600">
            Balance: {formatCurrency(balanceValue)}
          </p>
          <p className="text-blue-600">
            Profit: {formatCurrency(profitValue)}
          </p>
        </div>
      );
    }
    return null;
  };

  const hasActiveInvestments = investments.some(inv => inv.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Earnings Tracker
          </h2>
          <p className="text-muted-foreground">
            {hasActiveInvestments 
              ? 'Track your compounding growth and project future earnings'
              : 'Visualize potential earnings with our projection calculator'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="view-mode" className="text-sm">View:</Label>
            <Select value={viewMode} onValueChange={(value: 'weekly' | 'monthly') => setViewMode(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {hasActiveInvestments ? 'Your Compounding Growth' : 'Sample Growth Projection'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No data available</p>
              </div>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="week" 
                    tickFormatter={(value) => `W${value}`}
                    className="text-xs"
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                    className="text-xs"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Balance area */}
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#10B981"
                    fill="url(#balanceGradient)"
                    strokeWidth={2}
                  />
                  
                  {/* Profit line */}
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                  
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Call to Action for users without investments */}
      {!hasActiveInvestments && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <Target className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-bold">Start Your Investment Journey</h3>
              <p className="text-muted-foreground">
                Use the projection calculator above to see your potential earnings, then start investing to track your real growth!
              </p>
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <DollarSign className="h-5 w-5 mr-2" />
                Start Investing Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EarningsTracker;
