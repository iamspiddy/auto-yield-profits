import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, Banknote, TrendingUp, UserPlus, Activity, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalUsers: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalVolume: number;
  activeReferrals: number;
  adminActions: number;
  pendingKYC: number;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch pending deposits
      const { count: pendingDeposits } = await supabase
        .from('deposits')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch pending withdrawals
      const { count: pendingWithdrawals } = await supabase
        .from('withdrawals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch total volume (approved deposits + completed withdrawals)
      const { data: deposits } = await supabase
        .from('deposits')
        .select('amount')
        .eq('status', 'approved');

      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('status', 'completed');

      const totalVolume = (deposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0) +
                         (withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0);

      // Fetch active referrals
      const { count: activeReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch today's admin actions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: adminActions } = await supabase
        .from('admin_actions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Fetch pending KYC
      const { count: pendingKYC } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('kyc_status', 'pending');

      setStats({
        totalUsers: totalUsers || 0,
        pendingDeposits: pendingDeposits || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        totalVolume,
        activeReferrals: activeReferrals || 0,
        adminActions: adminActions || 0,
        pendingKYC: pendingKYC || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
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
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage your platform operations
        </p>
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
    </div>
  );
};