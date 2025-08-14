import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Wallet,
  TrendingUp,
  Shield,
  Users2,
  Activity,
  LogOut,
  Menu,
  X,
  Settings,
  BarChart3,
  FileText,
  AlertCircle,
  Key
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalDeposits: number;
  totalProfit: number;
  pendingWithdrawals: number;
  pendingKYC: number;
}

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalDeposits: 0,
    totalProfit: 0,
    pendingWithdrawals: 0,
    pendingKYC: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch basic stats
      const { data: users } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' });

      const { data: deposits } = await supabase
        .from('deposits')
        .select('amount', { count: 'exact' })
        .eq('status', 'approved');

      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');

      // KYC removed - no longer needed
      const kycPending = [];

      setStats({
        totalUsers: users?.length || 0,
        totalDeposits: deposits?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0,
        totalProfit: 0, // Calculate from earnings table
        pendingWithdrawals: withdrawals?.length || 0,
        pendingKYC: kycPending?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      badge: stats.totalUsers
    },
    {
      name: 'Deposits',
      href: '/admin/deposits',
      icon: CreditCard,
      badge: null
    },
    {
      name: 'Withdrawals',
      href: '/admin/withdrawals',
      icon: Wallet,
      badge: stats.pendingWithdrawals
    },
    {
      name: 'Profit Distribution',
      href: '/admin/profits',
      icon: TrendingUp,
      badge: null
    },
    {
      name: 'PIN Management',
      href: '/admin/pins',
      icon: Key,
      badge: null
    },
    // KYC Verification removed
    {
      name: 'Referrals',
      href: '/admin/referrals',
      icon: Users2,
      badge: null
    },
    {
      name: 'Activity Log',
      href: '/admin/logs',
      icon: Activity,
      badge: null
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:inset-auto ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-green-500" />
              <span className="text-xl font-bold text-white">Admin Panel</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-400">Administrator</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-gray-300">
                  {stats.pendingWithdrawals} pending withdrawals
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 