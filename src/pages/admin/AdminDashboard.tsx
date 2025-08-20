import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EarningsTable from '@/components/admin/EarningsTable';
import {
  Users,
  CreditCard,
  TrendingUp,
  Wallet,
  Shield,
  Activity,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalDeposits: number;
  totalProfit: number;
  pendingWithdrawals: number;
  totalReferrals: number;
  monthlyGrowth: number;
}

interface RecentActivity {
  id: string;
  action: string;
  user_email: string;
  amount?: number;
  timestamp: string;
  status: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDeposits: 0,
    totalProfit: 0,
    pendingWithdrawals: 0,
    totalReferrals: 0,
    monthlyGrowth: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch users count
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, created_at');

      // Fetch deposits
      const { data: deposits, error: depositsError } = await supabase
        .from('deposits')
        .select('id, user_id, amount, status, created_at');

      // Fetch withdrawals
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('id, user_id, amount, status, created_at');

      // Fetch earnings
      const { data: earnings, error: earningsError } = await supabase
        .from('earnings')
        .select('id, amount, created_at');

      // Fetch referrals
      const { data: referrals, error: referralsError } = await supabase
        .from('referrals')
        .select('id, created_at');

      if (usersError || depositsError || withdrawalsError || earningsError || referralsError) {
        console.error('Dashboard data errors:', { usersError, depositsError, withdrawalsError, earningsError, referralsError });
        throw new Error('Error fetching dashboard data');
      }

      const totalUsers = users?.length || 0;
      const totalDeposits = deposits?.filter(d => d.status === 'approved').reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const totalProfit = earnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0;
      const totalReferrals = referrals?.length || 0;

      // Calculate monthly growth (simplified)
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const thisMonthUsers = users?.filter(u => new Date(u.created_at) >= lastMonth).length || 0;
      const lastMonthUsers = totalUsers - thisMonthUsers;
      const monthlyGrowth = lastMonthUsers > 0 ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0;

      setStats({
        totalUsers,
        totalDeposits,
        totalProfit,
        pendingWithdrawals,
        totalReferrals,
        monthlyGrowth
      });

      // Fetch recent activity with proper user data
      console.log('Fetching recent activity with user data...');
      
      const recentDeposits = await Promise.all(
        (deposits?.slice(0, 5) || []).map(async (d) => {
          console.log('Looking up user for deposit:', d.user_id);
          
          // Skip if user_id is undefined or null
          if (!d.user_id) {
            console.warn('Deposit has no user_id:', d.id);
            return {
              id: d.id,
              action: 'Deposit',
              user_email: 'Unknown User',
              amount: d.amount,
              timestamp: d.created_at,
              status: d.status
            };
          }

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', d.user_id)
            .single();

          if (profileError) {
            console.error('Error fetching profile for deposit:', profileError);
          }

          return {
            id: d.id,
            action: 'Deposit',
            user_email: profile?.email || `User ${d.user_id.slice(0, 8)}...`,
            amount: d.amount,
            timestamp: d.created_at,
            status: d.status
          };
        })
      );

      const recentWithdrawals = await Promise.all(
        (withdrawals?.slice(0, 5) || []).map(async (w) => {
          console.log('Looking up user for withdrawal:', w.user_id);
          
          // Skip if user_id is undefined or null
          if (!w.user_id) {
            console.warn('Withdrawal has no user_id:', w.id);
            return {
              id: w.id,
              action: 'Withdrawal',
              user_email: 'Unknown User',
              amount: w.amount,
              timestamp: w.created_at,
              status: w.status
            };
          }

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', w.user_id)
            .single();

          if (profileError) {
            console.error('Error fetching profile for withdrawal:', profileError);
          }

          return {
            id: w.id,
            action: 'Withdrawal',
            user_email: profile?.email || `User ${w.user_id.slice(0, 8)}...`,
            amount: w.amount,
            timestamp: w.created_at,
            status: w.status
          };
        })
      );

      console.log('Recent deposits with users:', recentDeposits);
      console.log('Recent withdrawals with users:', recentWithdrawals);

      setRecentActivity([...recentDeposits, ...recentWithdrawals].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 10));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'default',
      completed: 'default',
      pending: 'secondary',
      rejected: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 sm:p-6">
                <div className="animate-pulse">
                  <div className="h-3 sm:h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-6 sm:h-8 bg-gray-700 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Monitor platform activity and key metrics</p>
        </div>
        <Button 
          onClick={fetchDashboardData} 
          variant="outline" 
          size="sm"
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</div>
            <div className="flex items-center text-xs text-gray-400 mt-1">
              {stats.monthlyGrowth >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              {Math.abs(stats.monthlyGrowth).toFixed(1)}% from last month
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">Total Deposits</CardTitle>
            <CreditCard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(stats.totalDeposits)}</div>
            <div className="text-xs text-gray-400 mt-1">All time deposits</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">Profit Distributed</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(stats.totalProfit)}</div>
            <div className="text-xs text-gray-400 mt-1">Total earnings paid out</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">Pending Actions</CardTitle>
            <Activity className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-white">{stats.pendingWithdrawals}</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.pendingWithdrawals} withdrawals
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg text-white">Quick Actions</CardTitle>
            <CardDescription className="text-gray-400 text-sm">Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-0">
            <Button className="w-full justify-start text-sm" variant="outline" size="sm">
              <Shield className="mr-2 h-4 w-4" />
              Review Users
            </Button>
            <Button className="w-full justify-start text-sm" variant="outline" size="sm">
              <Wallet className="mr-2 h-4 w-4" />
              Process Withdrawals ({stats.pendingWithdrawals})
            </Button>
            <Button className="w-full justify-start text-sm" variant="outline" size="sm">
              <CreditCard className="mr-2 h-4 w-4" />
              Approve Deposits
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg text-white">Platform Stats</CardTitle>
            <CardDescription className="text-gray-400 text-sm">Key metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-0">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Referral Program</span>
              <Badge variant="secondary" className="text-xs">{stats.totalReferrals}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Avg. Deposit</span>
              <span className="text-white font-medium text-sm">
                {stats.totalUsers > 0 ? formatCurrency(stats.totalDeposits / stats.totalUsers) : '$0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Success Rate</span>
              <span className="text-green-500 font-medium text-sm">98.5%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg text-white">System Status</CardTitle>
            <CardDescription className="text-gray-400 text-sm">Platform health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-0">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">API Status</span>
              <Badge variant="default" className="bg-green-600 text-xs">Online</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Database</span>
              <Badge variant="default" className="bg-green-600 text-xs">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Payments</span>
              <Badge variant="default" className="bg-green-600 text-xs">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg text-white">Recent Activity</CardTitle>
          <CardDescription className="text-gray-400 text-sm">Latest platform transactions</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {/* Mobile Card Layout */}
          <div className="block sm:hidden">
            {recentActivity.length === 0 ? (
              <div className="text-center text-gray-400 py-8 px-4">
                No recent activity
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="bg-gray-700 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center flex-1 min-w-0">
                        {getStatusIcon(activity.status)}
                        <span className="ml-2 text-white font-medium">{activity.action}</span>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {getStatusBadge(activity.status)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-300 truncate">{activity.user_email}</div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-white font-medium">
                        {activity.amount ? formatCurrency(activity.amount) : '-'}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {formatDate(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Action</TableHead>
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Amount</TableHead>
                  <TableHead className="text-gray-300 hidden md:table-cell">Status</TableHead>
                  <TableHead className="text-gray-300 hidden lg:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {recentActivity.map((activity) => (
                <TableRow key={activity.id} className="border-gray-700">
                  <TableCell className="text-white">
                    <div className="flex items-center">
                      {getStatusIcon(activity.status)}
                      <span className="ml-2">{activity.action}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">{activity.user_email}</TableCell>
                  <TableCell className="text-white">
                    {activity.amount ? formatCurrency(activity.amount) : '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {getStatusBadge(activity.status)}
                  </TableCell>
                  <TableCell className="text-gray-300 hidden lg:table-cell">
                    {formatDate(activity.timestamp)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Table */}
      <EarningsTable />
    </div>
  );
};

export default AdminDashboard; 