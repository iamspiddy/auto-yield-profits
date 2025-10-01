import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import InvestmentPlans from '@/components/dashboard/InvestmentPlans';
import InvestmentForm from '@/components/dashboard/InvestmentForm';
import MyInvestments from '@/components/dashboard/MyInvestments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, BarChart3, ArrowLeft } from 'lucide-react';
import type { InvestmentPlan } from '@/lib/investmentService';

const Investments: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSelectPlan = (plan: InvestmentPlan) => {
    setSelectedPlan(plan);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedPlan(null);
    // Refresh the page to show updated investments
    window.location.reload();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedPlan(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          {/* Go Back Button */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          
          {/* Title Section */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Investment Center
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose from our premium investment plans and start earning weekly compound profits. 
              Your money works for you with guaranteed returns.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weekly Returns</p>
                  <p className="text-2xl font-bold text-green-600">10% - 50%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Minimum Investment</p>
                  <p className="text-2xl font-bold text-blue-600">$200</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Compounding</p>
                  <p className="text-2xl font-bold text-purple-600">Weekly</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {showForm && selectedPlan ? (
          <InvestmentForm
            plan={selectedPlan}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        ) : (
          <Tabs defaultValue="plans" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="plans">Investment Plans</TabsTrigger>
              <TabsTrigger value="my-investments">My Investments</TabsTrigger>
            </TabsList>

            <TabsContent value="plans">
              <InvestmentPlans onSelectPlan={handleSelectPlan} />
            </TabsContent>

            <TabsContent value="my-investments">
              <MyInvestments />
            </TabsContent>
          </Tabs>
        )}

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Guaranteed Returns
            </h3>
            <p className="text-muted-foreground">
              Our investment plans offer guaranteed weekly returns with no market risk
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Weekly Compounding
            </h3>
            <p className="text-muted-foreground">
              Your profits are automatically reinvested every week for maximum growth
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Transparent Tracking
            </h3>
            <p className="text-muted-foreground">
              Monitor your investments with real-time updates and detailed analytics
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Investments;
