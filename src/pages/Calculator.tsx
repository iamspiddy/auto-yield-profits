import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calculator, 
  Play,
  Target,
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart3
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ProjectionInput {
  amount: number;
  plan: string;
  weeks: number;
}

interface ProjectionResult {
  finalBalance: number;
  totalProfit: number;
  weeklyProfit: number;
}

const CalculatorPage = () => {
  const { user, loading } = useAuth();
  
  // Projection calculator state
  const [projectionInput, setProjectionInput] = useState<ProjectionInput>({
    amount: 1000,
    plan: 'Gold',
    weeks: 12
  });
  const [projectionResult, setProjectionResult] = useState<ProjectionResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Investment plans data
  const investmentPlans = [
    { name: 'Bronze', weeklyRate: 10, color: '#CD7F32', minAmount: 200 },
    { name: 'Silver', weeklyRate: 20, color: '#C0C0C0', minAmount: 400 },
    { name: 'Gold', weeklyRate: 40, color: '#FFD700', minAmount: 800 },
    { name: 'Diamond', weeklyRate: 50, color: '#B9F2FF', minAmount: 1200 }
  ];

  // Calculate projection
  const calculateProjection = () => {
    setCalculating(true);
    
    const selectedPlan = investmentPlans.find(plan => plan.name === projectionInput.plan);
    if (!selectedPlan) return;

    const weeklyRate = selectedPlan.weeklyRate / 100;
    const finalBalance = projectionInput.amount * Math.pow(1 + weeklyRate, projectionInput.weeks);
    const totalProfit = finalBalance - projectionInput.amount;
    const weeklyProfit = projectionInput.amount * weeklyRate;

    setProjectionResult({
      finalBalance: Math.round(finalBalance * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      weeklyProfit: Math.round(weeklyProfit * 100) / 100
    });

    setCalculating(false);
  };

  // Handle projection input changes
  const handleProjectionChange = (field: keyof ProjectionInput, value: string | number) => {
    setProjectionInput(prev => ({
      ...prev,
      [field]: field === 'amount' || field === 'weeks' ? Number(value) : value
    }));
  };

  // Get plan color
  const getPlanColor = (planName: string) => {
    const plan = investmentPlans.find(p => p.name === planName);
    return plan?.color || '#3B82F6';
  };

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              Investment Calculator
            </h1>
            <p className="text-muted-foreground">
              Calculate your potential earnings and see how your investments can grow over time
            </p>
          </div>
        </div>

        {/* Calculator Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Earnings Projection Calculator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Input Form */}
              <div className="space-y-6">
                <div>
                  <Label htmlFor="amount" className="text-base font-medium">
                    Investment Amount ($)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={projectionInput.amount}
                    onChange={(e) => handleProjectionChange('amount', e.target.value)}
                    placeholder="Enter amount"
                    min="0"
                    step="100"
                    className="mt-2 text-lg"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Minimum investment varies by plan
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="plan" className="text-base font-medium">
                    Investment Plan
                  </Label>
                  <Select 
                    value={projectionInput.plan} 
                    onValueChange={(value) => handleProjectionChange('plan', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {investmentPlans.map(plan => (
                        <SelectItem key={plan.name} value={plan.name}>
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: plan.color }}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{plan.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {plan.weeklyRate}% weekly • Min: ${plan.minAmount}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="weeks" className="text-base font-medium">
                    Investment Duration (weeks)
                  </Label>
                  <Input
                    id="weeks"
                    type="number"
                    value={projectionInput.weeks}
                    onChange={(e) => handleProjectionChange('weeks', e.target.value)}
                    placeholder="Enter weeks"
                    min="1"
                    max="52"
                    className="mt-2 text-lg"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose between 1-52 weeks
                  </p>
                </div>
                
                <Button 
                  onClick={calculateProjection}
                  disabled={calculating || projectionInput.amount <= 0}
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  {calculating ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  ) : (
                    <Play className="h-5 w-5 mr-2" />
                  )}
                  Calculate Projection
                </Button>
              </div>

              {/* Results */}
              <div className="space-y-4">
                {projectionResult ? (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-xl flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Projection Results
                    </h4>
                    
                    <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 p-6 rounded-lg border border-green-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-green-500" />
                          <span className="text-green-700 font-medium">Final Balance</span>
                        </div>
                        <span className="text-3xl font-bold text-green-600">
                          {formatCurrency(projectionResult.finalBalance)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 p-6 rounded-lg border border-blue-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-500" />
                          <span className="text-blue-700 font-medium">Total Profit</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">
                          {formatCurrency(projectionResult.totalProfit)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 p-6 rounded-lg border border-purple-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-purple-500" />
                          <span className="text-purple-700 font-medium">Weekly Profit</span>
                        </div>
                        <span className="text-xl font-bold text-purple-600">
                          {formatCurrency(projectionResult.weeklyProfit)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground text-center">
                        If you invest <strong>{formatCurrency(projectionInput.amount)}</strong> in{' '}
                        <strong style={{ color: getPlanColor(projectionInput.plan) }}>
                          {projectionInput.plan}
                        </strong>, after{' '}
                        <strong>{projectionInput.weeks} weeks</strong> your balance will be{' '}
                        <strong className="text-green-600">
                          ≈ {formatCurrency(projectionResult.finalBalance)}
                        </strong>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calculator className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      Ready to Calculate?
                    </h3>
                    <p className="text-muted-foreground">
                      Enter your investment details and click "Calculate Projection" to see your potential earnings.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investment Plans Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Available Investment Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {investmentPlans.map(plan => (
                <div 
                  key={plan.name}
                  className="p-4 rounded-lg border-2 hover:border-primary/50 transition-colors"
                  style={{ borderColor: plan.color + '40' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: plan.color }}
                    />
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weekly Rate:</span>
                      <span className="font-medium">{plan.weeklyRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min Amount:</span>
                      <span className="font-medium">${plan.minAmount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <Target className="h-16 w-16 text-primary mx-auto" />
              <h3 className="text-2xl font-bold">Ready to Start Investing?</h3>
              <p className="text-muted-foreground text-lg">
                Use the calculator above to see your potential earnings, then start your investment journey!
              </p>
              <div className="flex gap-4 justify-center">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Start Investing
                </Button>
                <Button size="lg" variant="outline">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  View Plans
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CalculatorPage;
