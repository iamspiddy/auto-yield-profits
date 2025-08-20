import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EarningsTable from '@/components/admin/EarningsTable';
import {
  Users,
  Search,
  Filter,
  Eye,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  Users2
} from 'lucide-react';

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  balance: number | null;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
  deposits?: Deposit[];
  withdrawals?: Withdrawal[];
  referrals?: Referral[];
  earnings?: Earnings[];
}

interface Deposit {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Referral {
  id: string;
  referred_id: string;
  total_earned: number | null;
  created_at: string;
}

interface Earnings {
  id: string;
  amount: number;
  description?: string;
  created_at: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data for each user
      const usersWithDetails = await Promise.all(
        profiles.map(async (profile) => {
          try {
            const { data: deposits } = await supabase
              .from('deposits')
              .select('id, amount, status, created_at')
              .eq('user_id', profile.user_id);

            const { data: withdrawals } = await supabase
              .from('withdrawals')
              .select('id, amount, status, created_at')
              .eq('user_id', profile.user_id);

            const { data: referrals } = await supabase
              .from('referrals')
              .select('id, referred_id, total_earned, created_at')
              .eq('referrer_id', profile.user_id);

            const { data: earnings } = await supabase
              .from('earnings')
              .select('id, amount, description, created_at')
              .eq('user_id', profile.user_id);

            return {
              ...profile,
              deposits: deposits || [],
              withdrawals: withdrawals || [],
              referrals: referrals || [],
              earnings: earnings || []
            };
          } catch (error) {
            console.error(`Error fetching details for user ${profile.user_id}:`, error);
            return {
              ...profile,
              deposits: [],
              withdrawals: [],
              referrals: [],
              earnings: []
            };
          }
        })
      );

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.referral_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    switch (statusFilter) {
      case 'active':
        filtered = filtered.filter(user => 
          user.deposits && user.deposits.length > 0
        );
        break;
      case 'inactive':
        filtered = filtered.filter(user => 
          !user.deposits || user.deposits.length === 0
        );
        break;
      case 'with_balance':
        filtered = filtered.filter(user => 
          user.balance && user.balance > 0
        );
        break;
      case 'referrers':
        filtered = filtered.filter(user => 
          user.referrals && user.referrals.length > 0
        );
        break;
      default:
        break;
    }

    setFilteredUsers(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalDeposits = (user: User) => {
    return user.deposits?.reduce((sum, deposit) => sum + deposit.amount, 0) || 0;
  };

  const getTotalWithdrawals = (user: User) => {
    return user.withdrawals?.reduce((sum, withdrawal) => sum + withdrawal.amount, 0) || 0;
  };

  const getReferralEarnings = (user: User) => {
    return user.referrals?.reduce((sum, referral) => sum + (referral.total_earned || 0), 0) || 0;
  };

  const getTotalEarnings = (user: User) => {
    return user.earnings?.reduce((sum, earning) => sum + earning.amount, 0) || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-2">Manage user accounts and platform activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Users2 className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-400">{filteredUsers.length} users</span>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by email, name, or referral code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-gray-700 border-gray-600 text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active Users</SelectItem>
                  <SelectItem value="inactive">Inactive Users</SelectItem>
                  <SelectItem value="with_balance">With Balance</SelectItem>
                  <SelectItem value="referrers">Referrers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Table */}
      <EarningsTable 
        title="All Users Earnings"
        limit={100}
      />

      {/* Users Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Balance</TableHead>
                  <TableHead className="text-gray-300 hidden sm:table-cell">Deposits</TableHead>
                  <TableHead className="text-gray-300 hidden md:table-cell">Withdrawals</TableHead>
                  <TableHead className="text-gray-300 hidden lg:table-cell">Earnings</TableHead>
                  <TableHead className="text-gray-300 hidden lg:table-cell">Referrals</TableHead>
                  <TableHead className="text-gray-300 hidden md:table-cell">Joined</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-gray-700 hover:bg-gray-700">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{user.full_name || 'N/A'}</span>
                        <span className="text-sm text-gray-400">{user.email}</span>
                        <span className="text-xs text-gray-500">ID: {user.user_id.slice(0, 8)}...</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-white">
                        {formatCurrency(user.balance || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-green-400">
                        {formatCurrency(getTotalDeposits(user))}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-red-400">
                        {formatCurrency(getTotalWithdrawals(user))}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-purple-400">
                        {formatCurrency(getTotalEarnings(user))}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-col">
                        <span className="text-white">{user.referrals?.length || 0}</span>
                        <span className="text-xs text-gray-400">
                          {formatCurrency(getReferralEarnings(user))}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-gray-400">
                        {formatDate(user.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setUserDetailsOpen(true);
                        }}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">User Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Detailed information about {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white">{selectedUser.full_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Referral Code:</span>
                      <span className="text-white">{selectedUser.referral_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Balance:</span>
                      <span className="text-white">{formatCurrency(selectedUser.balance || 0)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Activity Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Deposits:</span>
                      <span className="text-green-400">{formatCurrency(getTotalDeposits(selectedUser))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Withdrawals:</span>
                      <span className="text-red-400">{formatCurrency(getTotalWithdrawals(selectedUser))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Referrals:</span>
                      <span className="text-white">{selectedUser.referrals?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Referral Earnings:</span>
                      <span className="text-blue-400">{formatCurrency(getReferralEarnings(selectedUser))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Earnings:</span>
                      <span className="text-purple-400">{formatCurrency(getTotalEarnings(selectedUser))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Activity</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedUser.deposits?.slice(0, 5).map((deposit) => (
                    <div key={deposit.id} className="flex justify-between text-sm p-2 bg-gray-700 rounded">
                      <span className="text-green-400">+{formatCurrency(deposit.amount)} (Deposit)</span>
                      <span className="text-gray-400">{formatDate(deposit.created_at)}</span>
                    </div>
                  ))}
                  {selectedUser.withdrawals?.slice(0, 5).map((withdrawal) => (
                    <div key={withdrawal.id} className="flex justify-between text-sm p-2 bg-gray-700 rounded">
                      <span className="text-red-400">-{formatCurrency(withdrawal.amount)} (Withdrawal)</span>
                      <span className="text-gray-400">{formatDate(withdrawal.created_at)}</span>
                    </div>
                  ))}
                  {selectedUser.earnings?.slice(0, 5).map((earning) => (
                    <div key={earning.id} className="flex justify-between text-sm p-2 bg-gray-700 rounded">
                      <span className="text-purple-400">+{formatCurrency(earning.amount)} (Earnings)</span>
                      <span className="text-gray-400">{formatDate(earning.created_at)}</span>
                    </div>
                  ))}
                  {(!selectedUser.deposits || selectedUser.deposits.length === 0) && 
                   (!selectedUser.withdrawals || selectedUser.withdrawals.length === 0) &&
                   (!selectedUser.earnings || selectedUser.earnings.length === 0) && (
                    <div className="text-center text-gray-400 text-sm py-4">
                      No recent activity
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers; 