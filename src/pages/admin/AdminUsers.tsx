import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Users2,
  Edit,
  Plus,
  Minus
} from 'lucide-react';

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  balance: number; // Calculated from user_balances table
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
  
  // Balance update states
  const [balanceUpdateOpen, setBalanceUpdateOpen] = useState(false);
  const [updateAmount, setUpdateAmount] = useState('');
  const [updateDescription, setUpdateDescription] = useState('');
  const [updateType, setUpdateType] = useState<'add' | 'subtract'>('add');
  const [processing, setProcessing] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

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

            // Get current balance from user_balances table
            const { data: userBalance } = await supabase
              .from('user_balances')
              .select('available_balance, invested_balance')
              .eq('user_id', profile.user_id)
              .single();

            return {
              ...profile,
              balance: userBalance ? (userBalance.available_balance + userBalance.invested_balance) : 0,
              deposits: deposits || [],
              withdrawals: withdrawals || [],
              referrals: referrals || [],
              earnings: earnings || []
            };
          } catch (error) {
            console.error(`Error fetching details for user ${profile.user_id}:`, error);
            return {
              ...profile,
              balance: 0,
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
          user.balance > 0
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

  const handleBalanceUpdate = async () => {
    if (!selectedUser || !updateAmount || !updateDescription) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setProcessing(true);

      const amount = parseFloat(updateAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid amount",
          variant: "destructive"
        });
        return;
      }

      const finalAmount = updateType === 'add' ? amount : -amount;

      // Update user's available balance
      console.log('Updating balance for user:', selectedUser.user_id, 'Amount:', finalAmount);

      const { data: balanceData, error: balanceError } = await supabase
        .rpc('increment_balance', {
          user_id_param: selectedUser.user_id,
          amount_param: finalAmount
        });

      if (balanceError) {
        console.error('Balance update error:', balanceError);
        throw balanceError;
      }

      console.log('Balance updated successfully. New balance:', balanceData);

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: selectedUser.user_id,
          amount: amount,
          type: updateType === 'add' ? 'deposit' : 'withdrawal',
          status: 'completed',
          description: updateDescription
        });

      if (transactionError) throw transactionError;

      // Create balance transaction record
      const { error: balanceTransactionError } = await supabase
        .from('balance_transactions')
        .insert({
          user_id: selectedUser.user_id,
          transaction_type: 'admin_adjustment',
          amount: finalAmount,
          balance_before: selectedUser.balance,
          balance_after: selectedUser.balance + finalAmount,
          description: updateDescription,
          metadata: {
            admin_action: true,
            update_type: updateType
          }
        });

      if (balanceTransactionError) throw balanceTransactionError;

      toast({
        title: "Balance Updated",
        description: `Successfully ${updateType === 'add' ? 'added' : 'subtracted'} ${formatCurrency(amount)} from ${selectedUser.full_name || selectedUser.email}'s balance`,
      });

      // Reset form and close dialog
      setUpdateAmount('');
      setUpdateDescription('');
      setUpdateType('add');
      setBalanceUpdateOpen(false);
      
      // Refresh users data
      await fetchUsers();
    } catch (error) {
      console.error('Error updating balance:', error);
      toast({
        title: "Error",
        description: "Failed to update balance. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Manage user accounts and platform activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Users2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <span className="text-sm text-gray-400">{filteredUsers.length} users</span>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by email, name, or referral code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white text-sm sm:text-base"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
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
        </CardContent>
      </Card>

      {/* Earnings Table */}
      <EarningsTable 
        title="All Users Earnings"
        limit={100}
      />

      {/* Users Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-white text-lg sm:text-xl">Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {/* Mobile Card Layout */}
          <div className="block sm:hidden">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-gray-400 py-8 px-4">
                No users found
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="bg-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{user.full_name || 'N/A'}</div>
                        <div className="text-sm text-gray-400 truncate">{user.email}</div>
                        <div className="text-xs text-gray-500">ID: {user.user_id.slice(0, 8)}...</div>
                      </div>
                      <div className="flex gap-2 ml-2 flex-shrink-0">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setBalanceUpdateOpen(true);
                          }}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-gray-400">Balance</div>
                        <div className="font-medium text-white">{formatCurrency(user.balance)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Deposits</div>
                        <div className="text-green-400">{formatCurrency(getTotalDeposits(user))}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Referrals</div>
                        <div className="text-white">{user.referrals?.length || 0}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Joined</div>
                        <div className="text-gray-300">{new Date(user.created_at).toLocaleDateString()}</div>
                      </div>
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
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Balance</TableHead>
                  <TableHead className="text-gray-300 hidden md:table-cell">Deposits</TableHead>
                  <TableHead className="text-gray-300 hidden lg:table-cell">Withdrawals</TableHead>
                  <TableHead className="text-gray-300 hidden lg:table-cell">Earnings</TableHead>
                  <TableHead className="text-gray-300 hidden xl:table-cell">Referrals</TableHead>
                  <TableHead className="text-gray-300 hidden lg:table-cell">Joined</TableHead>
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
                        {formatCurrency(user.balance)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-green-400">
                        {formatCurrency(getTotalDeposits(user))}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-red-400">
                        {formatCurrency(getTotalWithdrawals(user))}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-purple-400">
                        {formatCurrency(getTotalEarnings(user))}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-col">
                        <span className="text-white">{user.referrals?.length || 0}</span>
                        <span className="text-xs text-gray-400">
                          {formatCurrency(getReferralEarnings(user))}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-gray-400">
                        {formatDate(user.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setBalanceUpdateOpen(true);
                          }}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
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
        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-lg sm:text-xl">User Details</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm sm:text-base">
              Detailed information about {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white break-words">{selectedUser.full_name || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white break-all">{selectedUser.email}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Referral Code:</span>
                      <span className="text-white">{selectedUser.referral_code}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Balance:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white">{formatCurrency(selectedUser.balance)}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBalanceUpdateOpen(true)}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Activity Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Total Deposits:</span>
                      <span className="text-green-400">{formatCurrency(getTotalDeposits(selectedUser))}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Total Withdrawals:</span>
                      <span className="text-red-400">{formatCurrency(getTotalWithdrawals(selectedUser))}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Referrals:</span>
                      <span className="text-white">{selectedUser.referrals?.length || 0}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Referral Earnings:</span>
                      <span className="text-blue-400">{formatCurrency(getReferralEarnings(selectedUser))}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-gray-400">Total Earnings:</span>
                      <span className="text-purple-400">{formatCurrency(getTotalEarnings(selectedUser))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Activity</h4>
                <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
                  {selectedUser.deposits?.slice(0, 5).map((deposit) => (
                    <div key={deposit.id} className="flex flex-col sm:flex-row sm:justify-between text-sm p-3 bg-gray-700 rounded gap-1 sm:gap-0">
                      <span className="text-green-400">+{formatCurrency(deposit.amount)} (Deposit)</span>
                      <span className="text-gray-400 text-xs sm:text-sm">{formatDate(deposit.created_at)}</span>
                    </div>
                  ))}
                  {selectedUser.withdrawals?.slice(0, 5).map((withdrawal) => (
                    <div key={withdrawal.id} className="flex flex-col sm:flex-row sm:justify-between text-sm p-3 bg-gray-700 rounded gap-1 sm:gap-0">
                      <span className="text-red-400">-{formatCurrency(withdrawal.amount)} (Withdrawal)</span>
                      <span className="text-gray-400 text-xs sm:text-sm">{formatDate(withdrawal.created_at)}</span>
                    </div>
                  ))}
                  {selectedUser.earnings?.slice(0, 5).map((earning) => (
                    <div key={earning.id} className="flex flex-col sm:flex-row sm:justify-between text-sm p-3 bg-gray-700 rounded gap-1 sm:gap-0">
                      <span className="text-purple-400">+{formatCurrency(earning.amount)} (Earnings)</span>
                      <span className="text-gray-400 text-xs sm:text-sm">{formatDate(earning.created_at)}</span>
                    </div>
                  ))}
                  {(!selectedUser.deposits || selectedUser.deposits.length === 0) && 
                   (!selectedUser.withdrawals || selectedUser.withdrawals.length === 0) &&
                   (!selectedUser.earnings || selectedUser.earnings.length === 0) && (
                    <div className="text-center text-gray-400 text-sm py-6">
                      No recent activity
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Balance Update Dialog */}
      <Dialog open={balanceUpdateOpen} onOpenChange={setBalanceUpdateOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-lg sm:text-xl">Update User Balance</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm sm:text-base">
              {selectedUser && `Update balance for ${selectedUser.full_name || selectedUser.email}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="updateType" className="text-gray-300 text-sm font-medium">
                Update Type
              </Label>
              <Select value={updateType} onValueChange={(value: 'add' | 'subtract') => setUpdateType(value)}>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="add">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-400" />
                      <span>Add to Balance</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="subtract">
                    <div className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-red-400" />
                      <span>Subtract from Balance</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="updateAmount" className="text-gray-300 text-sm font-medium">
                Amount (USD)
              </Label>
              <Input
                id="updateAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={updateAmount}
                onChange={(e) => setUpdateAmount(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white mt-1"
              />
            </div>

            <div>
              <Label htmlFor="updateDescription" className="text-gray-300 text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="updateDescription"
                placeholder="Reason for balance update..."
                value={updateDescription}
                onChange={(e) => setUpdateDescription(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white mt-1"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setBalanceUpdateOpen(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBalanceUpdate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={processing}
              >
                {processing ? 'Updating...' : 'Update Balance'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers; 