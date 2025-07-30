import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, Banknote, TrendingUp, UserPlus, Activity, Shield, Bug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { testDatabaseConnection, getBasicStats } from '@/utils/dbTest';

interface DashboardStats {
  totalUsers: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalVolume: number;
  activeReferrals: number;
  adminActions: number;
  pendingKYC: number;
}

interface RecentUser {
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  kyc_verified: boolean;
  balance: number;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalVolume: 0,
    activeReferrals: 0,
    adminActions: 0,
    pendingKYC: 0
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // Fetch total users
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Fetch pending deposits
      const { count: pendingDeposits, error: depositsError } = await supabase
        .from('deposits')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (depositsError) {
        console.error('Error fetching deposits:', depositsError);
      }

      // Fetch pending withdrawals
      const { count: pendingWithdrawals, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (withdrawalsError) {
        console.error('Error fetching withdrawals:', withdrawalsError);
      }

      // Fetch total volume (approved deposits + completed withdrawals)
      const { data: deposits, error: depositsDataError } = await supabase
        .from('deposits')
        .select('amount')
        .eq('status', 'approved');

      if (depositsDataError) {
        console.error('Error fetching deposits data:', depositsDataError);
      }

      const { data: withdrawals, error: withdrawalsDataError } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('status', 'completed');

      if (withdrawalsDataError) {
        console.error('Error fetching withdrawals data:', withdrawalsDataError);
      }

      const totalVolume = (deposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0) +
                         (withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0);

      // Fetch active referrals
      const { count: activeReferrals, error: referralsError } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (referralsError) {
        console.error('Error fetching referrals:', referralsError);
      }

      // Fetch today's admin actions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: adminActions, error: actionsError } = await supabase
        .from('admin_actions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      if (actionsError) {
        console.error('Error fetching admin actions:', actionsError);
      }

      // Fetch pending KYC (check both kyc_status and kyc_verified fields)
      const { count: pendingKYC, error: kycError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .or('kyc_status.eq.pending,kyc_verified.eq.false');

      if (kycError) {
        console.error('Error fetching KYC data:', kycError);
      }

      setStats({
        totalUsers: totalUsers || 0,
        pendingDeposits: pendingDeposits || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        totalVolume,
        activeReferrals: activeReferrals || 0,
        adminActions: adminActions || 0,
        pendingKYC: pendingKYC || 0
      });

      // Fetch recent users
      const { data: users, error: recentUsersError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at, kyc_verified, balance')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentUsersError) {
        console.error('Error fetching recent users:', recentUsersError);
      } else {
        setRecentUsers(users || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDebugTest = async () => {
    console.log('Running database debug test...');
    const connectionTest = await testDatabaseConnection();
    const basicStats = await getBasicStats();
    setDebugInfo({ connectionTest, basicStats });
  };

  const dashboardStats = [
    {
      title: 'Total Users',
      value: loading ? '...' : stats.totalUsers.toString(),
      description: 'Registered users',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Pending Deposits',
      value: loading ? '...' : stats.pendingDeposits.toString(),
      description: 'Awaiting approval',
      icon: CreditCard,
      color: 'text-orange-600',
    },
    {
      title: 'Pending Withdrawals',
      value: loading ? '...' : stats.pendingWithdrawals.toString(),
      description: 'Awaiting processing',
      icon: Banknote,
      color: 'text-red-600',
    },
    {
      title: 'Total Volume',
      value: loading ? '...' : `$${stats.totalVolume.toFixed(2)}`,
      description: 'All-time platform volume',
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      title: 'Active Referrals',
      value: loading ? '...' : stats.activeReferrals.toString(),
      description: 'Referral relationships',
      icon: UserPlus,
      color: 'text-purple-600',
    },
    {
      title: 'Pending KYC',
      value: loading ? '...' : stats.pendingKYC.toString(),
      description: 'Awaiting verification',
      icon: Shield,
      color: 'text-yellow-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage your platform operations
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDebugTest}
          className="flex items-center gap-2"
        >
          <Bug className="h-4 w-4" />
          Debug DB
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dashboardStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Users */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>Latest registered users on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading users...
            </div>
          ) : recentUsers.length > 0 ? (
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{user.full_name || 'Unnamed User'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${user.balance?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.kyc_verified ? 'Verified' : 'Unverified'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest admin actions and user activities</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading activity...
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {stats.adminActions > 0 ? `${stats.adminActions} actions today` : 'No recent activity to display'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Platform health and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Database</span>
                <span className="text-sm text-green-600">Healthy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Authentication</span>
                <span className="text-sm text-green-600">Operational</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Storage</span>
                <span className="text-sm text-green-600">Available</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">KYC System</span>
                <span className="text-sm text-green-600">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Information */}
      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Information
            </CardTitle>
            <CardDescription>Database connection and table status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Connection Status</h4>
                <p className={`text-sm ${debugInfo.connectionTest.connection ? 'text-green-600' : 'text-red-600'}`}>
                  {debugInfo.connectionTest.connection ? 'Connected' : 'Not Connected'}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Table Status</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(debugInfo.connectionTest.tables).map(([table, accessible]) => (
                    <div key={table} className="flex justify-between">
                      <span>{table}</span>
                      <span className={accessible ? 'text-green-600' : 'text-red-600'}>
                        {accessible ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {debugInfo.basicStats && (
                <div>
                  <h4 className="font-medium mb-2">Record Counts</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(debugInfo.basicStats).map(([table, count]) => (
                      <div key={table} className="flex justify-between">
                        <span>{table}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {debugInfo.connectionTest.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Errors</h4>
                  <div className="space-y-1 text-sm text-red-600">
                    {debugInfo.connectionTest.errors.map((error: string, index: number) => (
                      <p key={index}>{error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};