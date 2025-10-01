import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp, DollarSign, Clock, User, Eye, Pause, Play } from 'lucide-react';
import { InvestmentService, type InvestmentWithPlan } from '@/lib/investmentService';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AdminUserInvestments: React.FC = () => {
  const [investments, setInvestments] = useState<InvestmentWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      
      // Get all investments with plan details
      const { data, error } = await supabase
        .from('investments')
        .select(`
          *,
          plan:investment_plans(*),
          profiles!investments_profiles_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error('Error fetching investments:', error);
      toast({
        title: "Error",
        description: "Failed to load user investments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (investmentId: string, newStatus: 'active' | 'paused' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('investments')
        .update({ status: newStatus })
        .eq('id', investmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Investment ${newStatus === 'active' ? 'resumed' : newStatus} successfully`,
      });

      fetchInvestments();
    } catch (error: any) {
      console.error('Error updating investment status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update investment status",
        variant: "destructive"
      });
    }
  };

  const applyWeeklyCompounding = async () => {
    try {
      const results = await InvestmentService.applyWeeklyCompounding();
      
      toast({
        title: "Weekly Compounding Applied",
        description: `Applied compounding to ${results.length} investments`,
      });

      fetchInvestments();
    } catch (error: any) {
      console.error('Error applying weekly compounding:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to apply weekly compounding",
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

  const filteredInvestments = investments.filter(investment => {
    const matchesSearch = 
      investment.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investment.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investment.plan.plan_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || investment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 sm:h-8 bg-gray-700 rounded w-1/2 sm:w-1/4"></div>
          <div className="h-8 sm:h-10 bg-gray-700 rounded w-full"></div>
          <div className="h-48 sm:h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">User Investments Management</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Monitor and manage user investments</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={fetchInvestments}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm"
            size="sm"
          >
            Refresh Data
          </Button>
          <Button
            onClick={applyWeeklyCompounding}
            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm"
            size="sm"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Apply Weekly Compounding
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by user name, email, or plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Investments Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-white text-lg sm:text-xl">
            User Investments ({filteredInvestments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Plan</TableHead>
                  <TableHead className="text-gray-300">Invested Amount</TableHead>
                  <TableHead className="text-gray-300">Current Balance</TableHead>
                  <TableHead className="text-gray-300">Profit Earned</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Next Payout</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvestments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                      No investments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvestments.map((investment) => (
                    <TableRow key={investment.id} className="border-gray-700">
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">{investment.profiles?.full_name || 'Unknown'}</div>
                          <div className="text-sm text-gray-400">{investment.profiles?.email || 'No email'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${getPlanColor(investment.plan.plan_name)}`}>
                          {investment.plan.plan_name}
                        </div>
                        <div className="text-sm text-gray-400">
                          {investment.plan.weekly_profit_percent}% weekly
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                          {InvestmentService.formatCurrency(investment.invested_amount)}
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-blue-500 mr-1" />
                          {InvestmentService.formatCurrency(investment.current_balance)}
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
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
                      <TableCell className="text-gray-300">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-1" />
                          {InvestmentService.getDaysUntilNextCompound(investment.next_compound_date)} days
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(
                              investment.id,
                              investment.status === 'active' ? 'paused' : 'active'
                            )}
                            className={`${
                              investment.status === 'active' 
                                ? 'border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white'
                                : 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white'
                            }`}
                          >
                            {investment.status === 'active' ? (
                              <>
                                <Pause className="h-4 w-4 mr-1" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Resume
                              </>
                            )}
                          </Button>
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
                            className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-400">Total Invested</p>
                <p className="text-xl font-bold text-white">
                  {InvestmentService.formatCurrency(
                    investments.reduce((sum, inv) => sum + inv.invested_amount, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-400">Total Profit</p>
                <p className="text-xl font-bold text-white">
                  {InvestmentService.formatCurrency(
                    investments.reduce((sum, inv) => sum + inv.total_profit_earned, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-400">Active Investments</p>
                <p className="text-xl font-bold text-white">
                  {investments.filter(inv => inv.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-400">Due for Compounding</p>
                <p className="text-xl font-bold text-white">
                  {investments.filter(inv => 
                    inv.status === 'active' && 
                    new Date(inv.next_compound_date) <= new Date()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUserInvestments;
