import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EarningsData {
  date: string;
  amount: number;
}

const EarningsOverview = () => {
  const [earningsData, setEarningsData] = useState<EarningsData[]>([]);
  const [period, setPeriod] = useState('weekly');
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    nextPayout: 'Tomorrow'
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchEarningsData = async () => {
      try {
        const { data: earnings } = await supabase
          .from('earnings')
          .select('amount, earnings_date, created_at')
          .eq('user_id', user.id)
          .order('earnings_date', { ascending: true });

        if (earnings) {
          // Process data for chart
          const chartData = earnings.reduce((acc: Record<string, number>, earning) => {
            const date = new Date(earning.earnings_date).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + Number(earning.amount);
            return acc;
          }, {});

          const formattedData = Object.entries(chartData).map(([date, amount]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            amount
          }));

          setEarningsData(formattedData);

          // Calculate summaries
          const total = earnings.reduce((sum, earning) => sum + Number(earning.amount), 0);
          
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const weeklyTotal = earnings
            .filter(earning => new Date(earning.earnings_date) >= weekAgo)
            .reduce((sum, earning) => sum + Number(earning.amount), 0);

          const monthAgo = new Date();
          monthAgo.setDate(monthAgo.getDate() - 30);
          const monthlyTotal = earnings
            .filter(earning => new Date(earning.earnings_date) >= monthAgo)
            .reduce((sum, earning) => sum + Number(earning.amount), 0);

          setSummary({
            totalEarnings: total,
            weeklyEarnings: weeklyTotal,
            monthlyEarnings: monthlyTotal,
            nextPayout: 'Tomorrow'
          });
        }
      } catch (error) {
        console.error('Error fetching earnings data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEarningsData();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Earnings Overview
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Weekly Earnings</p>
                <p className="text-xl font-bold text-green-600">${summary.weeklyEarnings.toFixed(2)}</p>
              </div>
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Earnings</p>
                <p className="text-xl font-bold text-blue-600">${summary.monthlyEarnings.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Next Payout</p>
                <p className="text-xl font-bold text-purple-600">{summary.nextPayout}</p>
              </div>
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={earningsData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                className="text-muted-foreground"
              />
              <YAxis 
                fontSize={12}
                className="text-muted-foreground"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Earnings']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default EarningsOverview;