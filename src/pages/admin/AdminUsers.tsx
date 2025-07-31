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
import {
  Users,
  Search,
  Filter,
  Eye,
  Shield,
  UserCheck,
  UserX,
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
  kyc_verified: boolean | null;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
  deposits?: Deposit[];
  withdrawals?: Withdrawal[];
  referrals?: Referral[];
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

            return {
              ...profile,
              deposits: deposits || [],
              withdrawals: withdrawals || [],
              referrals: referrals || []
            };
          } catch (error) {
            console.error('Error fetching user details:', error);
            return {
              ...profile,
              deposits: [],
              withdrawals: [],
              referrals: []
            };
          }
        })
      );

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
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
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.referral_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        switch (statusFilter) {
          case 'kyc_verified':
            return user.kyc_verified === true;
          case 'kyc_pending':
            return user.kyc_verified === null;
          case 'kyc_rejected':
            return user.kyc_verified === false;
          case 'has_balance':
            return (user.balance || 0) > 0;
          case 'no_balance':
            return (user.balance || 0) === 0;
          default:
            return true;
        }
      });
    }

    setFilteredUsers(filtered);
  };

  const handleKYCStatusChange = async (userId: string, status: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ kyc_verified: status })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "KYC Status Updated",
        description: `User KYC status changed to ${status ? 'verified' : 'rejected'}`,
      });

      fetchUsers(); // Refresh data
    } catch (error) {
      console.error('Error updating KYC status:', error);
      toast({
        title: "Error",
        description: "Failed to update KYC status",
        variant: "destructive"
      });
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
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getKYCStatusBadge = (status: boolean | null) => {
    if (status === null) {
      return <Badge variant="secondary">Pending</Badge>;
    }
    return status ? (
      <Badge variant="default" className="bg-green-600">Verified</Badge>
    ) : (
      <Badge variant="destructive">Rejected</Badge>
    );
  };

  const getTotalDeposits = (user: User) => {
    return user.deposits?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
  };

  const getTotalWithdrawals = (user: User) => {
    return user.withdrawals?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
  };

  const getReferralEarnings = (user: User) => {
    return user.referrals?.reduce((sum, r) => sum + (r.total_earned || 0), 0) || 0;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-32"></div>
          </div>
        </div>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-700 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Users Management</h1>
          <p className="text-gray-400 mt-2">Manage user accounts and KYC verification</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{filteredUsers.length} users</Badge>
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
                  placeholder="Search by email, name, or referral code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="kyc_verified">KYC Verified</SelectItem>
                <SelectItem value="kyc_pending">KYC Pending</SelectItem>
                <SelectItem value="kyc_rejected">KYC Rejected</SelectItem>
                <SelectItem value="has_balance">Has Balance</SelectItem>
                <SelectItem value="no_balance">No Balance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Users</CardTitle>
          <CardDescription className="text-gray-400">
            Manage user accounts and verification status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">User</TableHead>
                <TableHead className="text-gray-300">Balance</TableHead>
                <TableHead className="text-gray-300">KYC Status</TableHead>
                <TableHead className="text-gray-300">Referrals</TableHead>
                <TableHead className="text-gray-300">Joined</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-gray-700">
                  <TableCell>
                    <div>
                      <div className="font-medium text-white">{user.full_name}</div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                      <div className="text-xs text-gray-500">Code: {user.referral_code}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-white">
                    {formatCurrency(user.balance || 0)}
                  </TableCell>
                  <TableCell>
                    {getKYCStatusBadge(user.kyc_verified)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Users2 className="h-4 w-4 text-blue-500" />
                      <span className="text-white">{user.referrals?.length || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-white">User Details</DialogTitle>
                            <DialogDescription className="text-gray-400">
                              View detailed user information and transaction history
                            </DialogDescription>
                          </DialogHeader>
                          {selectedUser && (
                            <div className="space-y-6">
                              {/* User Info */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Name</label>
                                  <p className="text-white">{selectedUser.full_name}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Email</label>
                                  <p className="text-white">{selectedUser.email}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Balance</label>
                                  <p className="text-white">{formatCurrency(selectedUser.balance || 0)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Referral Code</label>
                                  <p className="text-white">{selectedUser.referral_code}</p>
                                </div>
                              </div>

                              {/* KYC Actions */}
                              <div className="border-t border-gray-700 pt-4">
                                <h4 className="text-sm font-medium text-gray-300 mb-3">KYC Verification</h4>
                                <div className="flex items-center space-x-2">
                                  {getKYCStatusBadge(selectedUser.kyc_verified)}
                                  {selectedUser.kyc_verified === null && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleKYCStatusChange(selectedUser.user_id, true)}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <UserCheck className="h-4 w-4 mr-1" />
                                        Verify
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleKYCStatusChange(selectedUser.user_id, false)}
                                      >
                                        <UserX className="h-4 w-4 mr-1" />
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Transaction Summary */}
                              <div className="border-t border-gray-700 pt-4">
                                <h4 className="text-sm font-medium text-gray-300 mb-3">Transaction Summary</h4>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="text-center">
                                                    <div className="text-2xl font-bold text-blue-500">
                  {formatCurrency(getTotalDeposits(selectedUser))}
                </div>
                                    <div className="text-xs text-gray-400">Total Deposits</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-red-500">
                                      {formatCurrency(getTotalWithdrawals(selectedUser))}
                                    </div>
                                    <div className="text-xs text-gray-400">Total Withdrawals</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-500">
                                      {formatCurrency(getReferralEarnings(selectedUser))}
                                    </div>
                                    <div className="text-xs text-gray-400">Referral Earnings</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers; 