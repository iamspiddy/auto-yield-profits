import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, DollarSign, Clock, Eye, Pause, Play, Calendar, Timer, AlertTriangle, RefreshCw } from 'lucide-react';
import { InvestmentService, type InvestmentWithPlan, type InvestmentStats } from '@/lib/investmentService';
import { toast } from '@/hooks/use-toast';
import InvestmentDurationCard from './InvestmentDurationCard';
import InvestmentNotifications from './InvestmentNotifications';
import EarlyWithdrawalModal from './EarlyWithdrawalModal';
import ReinvestButton from './ReinvestButton';

const MyInvestments: React.FC = () => {
  const [investments, setInvestments] = useState<InvestmentWithPlan[]>([]);
  const [stats, setStats] = useState<InvestmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentWithPlan | null>(null);
  const [showEarlyWithdrawal, setShowEarlyWithdrawal] = useState(false);

  const fetchData = async () => {
    try {
      const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const [investmentsData, statsData] = await Promise.all([
        InvestmentService.getUserInvestments(user.id),
        InvestmentService.getUserInvestmentStats(user.id)
      ]);

      setInvestments(investmentsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching investments:', error);
      toast({
        title: "Error",
        description: "Failed to load investments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (investmentId: string, newStatus: 'active' | 'paused') => {
    try {
      const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      await InvestmentService.updateInvestmentStatus(investmentId, newStatus, user.id);
      
      // Update local state
      setInvestments(prev => prev.map(inv => 
        inv.id === investmentId ? { ...inv, status: newStatus } : inv
      ));

      toast({
        title: "Status Updated",
        description: `Investment ${newStatus === 'active' ? 'resumed' : 'paused'} successfully`,
      });
    } catch (error: any) {
      console.error('Error updating investment status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update investment status",
        variant: "destructive"
      });
    }
  };

  const handleEarlyWithdrawal = (investment: InvestmentWithPlan) => {
    setSelectedInvestment(investment);
    setShowEarlyWithdrawal(true);
  };

  const handleEarlyWithdrawalSuccess = () => {
    setShowEarlyWithdrawal(false);
    setSelectedInvestment(null);
    fetchData();
  };

  const handleReinvestSuccess = () => {
    fetchData();
  };

  const handleMaturityProcessing = async (investment: InvestmentWithPlan) => {
    try {
      const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const result = await InvestmentService.processInvestmentMaturity(investment.id, user.id);
      
      if (result.success) {
        toast({
          title: "Investment Matured",
          description: `Your investment has matured! ${InvestmentService.formatCurrency(result.maturityAmount)} has been added to your available balance.`,
        });
        fetchData();
      }
    } catch (error: any) {
      console.error('Error processing maturity:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process investment maturity",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'bronze':
        return 'text-amber-600';
      case 'silver':
        return 'text-gray-600';
      case 'gold':
        return 'text-yellow-600';
      case 'diamond':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Investment Notifications */}
      <InvestmentNotifications investments={investments} />

      {/* Investment Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Invested</p>
                  <p className="text-2xl font-bold">{InvestmentService.formatCurrency(stats.totalInvested)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Profit</p>
                  <p className="text-2xl font-bold text-green-600">
                    {InvestmentService.formatCurrency(stats.totalProfit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {InvestmentService.formatCurrency(stats.currentBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Investments</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.activeInvestments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Investments with Duration Cards */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>My Active Investments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {investments.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Investments Yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start your investment journey by choosing a plan and duration
                </p>
                <Button onClick={() => window.location.href = '/dashboard'}>
                  View Investment Plans
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {investments.map((investment) => (
                  <InvestmentDurationCard
                    key={investment.id}
                    investment={investment}
                    onEarlyWithdrawal={(investmentId) => {
                      // Refresh the investments list after withdrawal
                      fetchData();
                    }}
                    onReinvest={(investmentId) => {
                      // TODO: Implement reinvestment logic
                      toast({
                        title: "Reinvestment",
                        description: "Reinvestment feature coming soon",
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investment History Table */}
        {investments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Investment History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Current Balance</TableHead>
                    <TableHead>Profit Earned</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Maturity Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments.map((investment) => (
                    <TableRow key={investment.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className={getPlanColor(investment.plan.plan_name)}
                          >
                            {investment.plan.plan_name}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {investment.plan.weekly_profit_percent}% weekly
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Timer className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            {investment.user_selected_duration_weeks} weeks
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">
                          {InvestmentService.formatCurrency(investment.invested_amount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-green-600">
                          {InvestmentService.formatCurrency(investment.current_balance)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-blue-600">
                          {InvestmentService.formatCurrency(investment.total_profit_earned)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={getStatusColor(investment.status)}
                        >
                          {investment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {investment.maturity_date ? 
                            new Date(investment.maturity_date).toLocaleDateString() : 
                            'N/A'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {investment.status === 'active' && !investment.is_matured && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(
                                investment.id, 
                                'paused'
                              )}
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </Button>
                          )}
                          {investment.status === 'paused' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(
                                investment.id, 
                                'active'
                              )}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Resume
                            </Button>
                          )}
                          {investment.status === 'active' && !investment.is_matured && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEarlyWithdrawal(investment)}
                              className="text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Early Withdraw
                            </Button>
                          )}
                          {investment.is_matured && investment.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMaturityProcessing(investment)}
                              className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Process Maturity
                            </Button>
                          )}
                          {investment.status === 'completed' && (
                            <ReinvestButton
                              investment={investment}
                              onReinvestSuccess={handleReinvestSuccess}
                            />
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // TODO: Implement view details modal
                              toast({
                                title: "Coming Soon",
                                description: "Investment details view will be available soon",
                              });
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Early Withdrawal Modal */}
      {showEarlyWithdrawal && selectedInvestment && (
        <EarlyWithdrawalModal
          investment={selectedInvestment}
          onClose={() => setShowEarlyWithdrawal(false)}
          onSuccess={handleEarlyWithdrawalSuccess}
        />
      )}
    </div>
  );
};

export default MyInvestments;
