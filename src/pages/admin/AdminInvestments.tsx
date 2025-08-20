import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, DollarSign, TrendingUp, User, Edit, Plus, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  balance: number | null;
  created_at: string;
}

interface InvestmentUpdate {
  id: string;
  user_id: string;
  type: 'increase' | 'decrease';
  amount: number;
  description: string;
  created_at: string;
  created_by: string;
  user?: {
    email: string;
    full_name: string;
  };
}

// Type for raw investment update data from database
interface RawInvestmentUpdate {
  id: string;
  user_id: string;
  type: 'increase' | 'decrease';
  amount: number;
  description: string;
  created_at: string;
  created_by: string;
}

const AdminInvestments = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [investmentUpdates, setInvestmentUpdates] = useState<InvestmentUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [updateType, setUpdateType] = useState<'increase' | 'decrease'>('increase');
  const [updateAmount, setUpdateAmount] = useState('');
  const [updateDescription, setUpdateDescription] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchInvestmentUpdates();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users from profiles table...');
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          email,
          full_name,
          balance,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Users data received:', data);
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestmentUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('investment_updates')
        .select(`
          id,
          user_id,
          type,
          amount,
          description,
          created_at,
          created_by
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user details for each investment update
      if (data) {
        const updatesWithUsers = await Promise.all(
          data.map(async (update: RawInvestmentUpdate) => {
            const { data: userData } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('user_id', update.user_id)
              .single();
            
            return {
              ...update,
              user: userData || { email: 'Unknown', full_name: 'Unknown User' }
            };
          })
        );
        
        setInvestmentUpdates(updatesWithUsers);
      }
    } catch (error) {
      console.error('Error fetching investment updates:', error);
    }
  };

  const handleUpdateInvestment = async () => {
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

      const finalAmount = updateType === 'increase' ? amount : -amount;

      // Update user's invested amount
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

      // Create investment update record
      const { error: updateError } = await supabase
        .from('investment_updates')
        .insert({
          user_id: selectedUser.user_id,
          type: updateType,
          amount: amount,
          description: updateDescription,
          created_by: user?.id
        });

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: selectedUser.user_id,
          amount: amount,
          type: updateType === 'increase' ? 'deposit' : 'withdrawal',
          status: 'approved',
          description: updateDescription
        });

      if (transactionError) throw transactionError;

      // Create deposit record for investment increases (so user dashboard shows correct balance)
      if (updateType === 'increase') {
        const { error: depositError } = await supabase
          .from('deposits')
          .insert({
            user_id: selectedUser.user_id,
            amount: amount,
            currency: 'USD',
            status: 'approved',
            verified_at: new Date().toISOString(),
            verified_by: user?.id,
            notes: `Admin investment update: ${updateDescription}`
          });

        if (depositError) {
          console.error('Deposit creation error:', depositError);
          // Don't throw error - this is secondary to the main balance update
        }
      }

      // Log admin action (commented out - admin_actions table not available)
      // const { error: actionError } = await supabase
      //   .from('admin_actions')
      //   .insert({
      //     admin_id: user?.id,
      //     action_type: 'update',
      //     target_user_id: selectedUser.user_id,
      //     details: `${updateType === 'increase' ? 'Increased' : 'Decreased'} investment by $${amount} - ${updateDescription}`
      //   });

      // if (actionError) console.error('Action logging error:', actionError);

      toast({
        title: "Success",
        description: `Investment ${updateType === 'increase' ? 'increased' : 'decreased'} successfully`,
      });

      // Reset form and refresh data
      setShowUpdateDialog(false);
      setSelectedUser(null);
      setUpdateAmount('');
      setUpdateDescription('');
      
      // Force refresh data with a small delay to ensure database updates are committed
      setTimeout(() => {
        fetchUsers();
        fetchInvestmentUpdates();
      }, 500);

    } catch (error) {
      console.error('Error updating investment:', error);
      toast({
        title: "Error",
        description: "Failed to update investment",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openUpdateDialog = (user: User) => {
    setSelectedUser(user);
    setShowUpdateDialog(true);
  };

  const syncUserBalances = async () => {
    try {
      setProcessing(true);
      console.log('Syncing user balances...');

      // Get all users with their current balance
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, balance')
        .not('balance', 'is', null);

      if (usersError) throw usersError;

      let syncedCount = 0;
      for (const userData of usersData || []) {
        if (userData.balance && userData.balance > 0) {
          // Check if user has any deposits
          const { data: deposits, error: depositsError } = await supabase
            .from('deposits')
            .select('amount')
            .eq('user_id', userData.user_id)
            .eq('status', 'approved');

          if (depositsError) {
            console.error('Error checking deposits for user:', userData.user_id, depositsError);
            continue;
          }

          const totalDeposits = deposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
          const balanceDiff = Number(userData.balance) - totalDeposits;

          // If there's a difference, create a deposit record
          if (balanceDiff > 0) {
            console.log(`User ${userData.user_id} has balance ${userData.balance} but deposits ${totalDeposits}. Creating deposit for ${balanceDiff}`);
            
            const { error: depositError } = await supabase
              .from('deposits')
              .insert({
                user_id: userData.user_id,
                amount: balanceDiff,
                currency: 'USD',
                status: 'approved',
                verified_at: new Date().toISOString(),
                verified_by: user?.id,
                notes: 'Balance sync: Admin investment update'
              });

            if (depositError) {
              console.error('Error creating deposit for user:', userData.user_id, depositError);
            } else {
              syncedCount++;
            }
          }
        }
      }

      toast({
        title: "Balance Sync Complete",
        description: `Synced ${syncedCount} user balances`,
      });

      // Refresh data
      fetchUsers();
      fetchInvestmentUpdates();

    } catch (error) {
      console.error('Error syncing balances:', error);
      toast({
        title: "Error",
        description: "Failed to sync balances",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded w-full"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Investment Management</h1>
          <p className="text-gray-400 mt-2">Manage user investment amounts and track changes</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2">
          <Button 
            onClick={() => {
              fetchUsers();
              fetchInvestmentUpdates();
            }}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            <Search className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button 
            onClick={syncUserBalances}
            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Sync Balances
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Users & Investments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Balance</TableHead>
                  <TableHead className="text-gray-300">Joined</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-gray-700">
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">{user.full_name}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                          {formatCurrency(user.balance || 0)}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => openUpdateDialog(user)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Investment Updates History */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Investment Update History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Type</TableHead>
                  <TableHead className="text-gray-300">Amount</TableHead>
                  <TableHead className="text-gray-300">Description</TableHead>
                  <TableHead className="text-gray-300">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investmentUpdates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                      No investment updates yet
                    </TableCell>
                  </TableRow>
                ) : (
                  investmentUpdates.map((update) => (
                    <TableRow key={update.id} className="border-gray-700">
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">{update.user?.full_name}</div>
                          <div className="text-sm text-gray-400">{update.user?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={update.type === 'increase' ? 'default' : 'destructive'}
                          className={update.type === 'increase' ? 'bg-green-600' : 'bg-red-600'}
                        >
                          {update.type === 'increase' ? (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Increase
                            </>
                          ) : (
                            <>
                              <Minus className="h-3 w-3 mr-1" />
                              Decrease
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                          {formatCurrency(update.amount)}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 max-w-xs truncate">
                        {update.description}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(update.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Update Investment Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Update Investment Amount</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">User</Label>
              <div className="mt-2 p-3 bg-gray-700 rounded-lg">
                <div className="font-medium text-white">{selectedUser?.full_name}</div>
                <div className="text-sm text-gray-400">{selectedUser?.email}</div>
                <div className="text-sm text-gray-400 mt-1">
                  Current: {formatCurrency(selectedUser?.balance || 0)}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Update Type</Label>
              <Select value={updateType} onValueChange={(value: 'increase' | 'decrease') => setUpdateType(value)}>
                <SelectTrigger className="mt-2 bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase Investment</SelectItem>
                  <SelectItem value="decrease">Decrease Investment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount" className="text-gray-300">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={updateAmount}
                onChange={(e) => setUpdateAmount(e.target.value)}
                placeholder="Enter amount"
                className="mt-2 bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-gray-300">Description</Label>
              <Textarea
                id="description"
                value={updateDescription}
                onChange={(e) => setUpdateDescription(e.target.value)}
                placeholder="Reason for update..."
                className="mt-2 bg-gray-700 border-gray-600 text-white"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowUpdateDialog(false)}
                disabled={processing}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateInvestment}
                disabled={processing || !updateAmount || !updateDescription}
                className={`${
                  updateType === 'increase' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing ? 'Processing...' : `${updateType === 'increase' ? 'Increase' : 'Decrease'} Investment`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInvestments;
