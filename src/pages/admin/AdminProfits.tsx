import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  Plus,
  Minus,
  Eye
} from 'lucide-react';

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  balance: number | null;
  created_at: string;
}

interface ProfitDistribution {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  created_at: string;
  created_by: string;
  user?: {
    email: string;
    full_name: string;
  };
}

const AdminProfits = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [distributionAmount, setDistributionAmount] = useState('');
  const [description, setDescription] = useState('');
  const [distributionType, setDistributionType] = useState('individual');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [distributions, setDistributions] = useState<ProfitDistribution[]>([]);
  const [showDistributionDialog, setShowDistributionDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
    fetchDistributions();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users for profit distribution...');

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching profiles:', error);
        throw error;
      }

      console.log('Fetched profiles:', profiles);
      setUsers(profiles || []);
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

  const fetchDistributions = async () => {
    try {
      console.log('Fetching distributions...');
      
      // First, fetch earnings data
      const { data: earningsData, error: earningsError } = await supabase
        .from('earnings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (earningsError) {
        console.error('Error fetching earnings:', earningsError);
        throw earningsError;
      }

      console.log('Fetched earnings data:', earningsData);

      // Then fetch user profiles separately to avoid foreign key issues
      const distributionsWithUsers = await Promise.all(
        (earningsData || []).map(async (earning) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', earning.user_id)
            .single();

          return {
            id: earning.id,
            user_id: earning.user_id,
            amount: earning.amount,
            description: earning.description || 'Profit distribution',
            created_at: earning.created_at,
            created_by: earning.created_by || 'admin',
            user: profile || { email: 'Unknown User', full_name: 'Unknown User' }
          };
        })
      );

      console.log('Distributions with users:', distributionsWithUsers);
      setDistributions(distributionsWithUsers);
    } catch (error) {
      console.error('Error fetching distributions:', error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(u => u.user_id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleDistributeProfits = async () => {
    if (!user || selectedUsers.length === 0 || !distributionAmount || !description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setProcessing(true);

      const amount = parseFloat(distributionAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid amount",
          variant: "destructive"
        });
        return;
      }

      // Process each selected user
      for (const userId of selectedUsers) {
        // Create earnings record (DO NOT add to wallet balance - earnings are separate)
        const { error: earningsError } = await supabase
          .from('earnings')
          .insert({
            user_id: userId,
            amount: amount,
            currency: 'USD',
            earnings_date: new Date().toISOString()
          });

        if (earningsError) throw earningsError;

        // Create transaction record
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            amount: amount,
            type: 'profit',
            status: 'completed',
            description: description
          });

        if (transactionError) throw transactionError;

        // UPDATE USER BALANCE - This was missing!
        const { data: balanceData, error: balanceError } = await supabase
          .rpc('increment_balance', {
            user_id_param: userId,
            amount_param: amount
          });

        if (balanceError) {
          console.error('Balance update error:', balanceError);
          throw balanceError;
        }
        console.log('Balance updated successfully. New balance:', balanceData);
      }

      toast({
        title: "Profit Distributed",
        description: `Successfully distributed ${formatCurrency(amount)} to ${selectedUsers.length} users`,
      });

      // Reset form
      setSelectedUsers([]);
      setDistributionAmount('');
      setDescription('');
      setShowDistributionDialog(false);

      // Refresh data
      fetchUsers();
      fetchDistributions();
    } catch (error) {
      console.error('Error distributing profits:', error);
      toast({
        title: "Error",
        description: "Failed to distribute profits",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalDistributed = () => {
    return distributions.reduce((sum, d) => sum + d.amount, 0);
  };

  const getVerifiedUsersCount = () => {
    return users.length;
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
          <h1 className="text-3xl font-bold text-white">Profit Distribution</h1>
          <p className="text-gray-400 mt-2">Distribute profits to verified users</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => {
              fetchUsers();
              fetchDistributions();
            }}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            onClick={() => setShowDistributionDialog(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Distribute Profits
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Distributed</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(getTotalDistributed())}</div>
            <div className="text-xs text-gray-400 mt-1">All time profit distributions</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{getVerifiedUsersCount()}</div>
            <div className="text-xs text-gray-400 mt-1">Eligible for distributions</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Recent Distributions</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{distributions.length}</div>
            <div className="text-xs text-gray-400 mt-1">In the last 50 records</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Selection */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Select Users</CardTitle>
          <CardDescription className="text-gray-400">
            Choose users to receive profit distributions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedUsers.length === users.length}
                onCheckedChange={handleSelectAll}
              />
              <label className="text-sm font-medium text-gray-300">
                Select all users ({users.length})
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {users.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-400">No users found</p>
                  <p className="text-sm text-gray-500">Total users: {users.length}</p>
                </div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                    <Checkbox
                      checked={selectedUsers.includes(user.user_id)}
                      onCheckedChange={(checked) => handleUserSelection(user.user_id, checked as boolean)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      <p className="text-xs text-gray-500">Balance: {formatCurrency(user.balance || 0)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Distributions */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Recent Distributions</CardTitle>
          <CardDescription className="text-gray-400">
            Latest profit distributions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">User</TableHead>
                <TableHead className="text-gray-300">Amount</TableHead>
                <TableHead className="text-gray-300">Description</TableHead>
                <TableHead className="text-gray-300">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distributions.map((distribution) => (
                <TableRow key={distribution.id} className="border-gray-700">
                  <TableCell>
                    <div>
                      <div className="font-medium text-white">{distribution.user?.full_name}</div>
                      <div className="text-sm text-gray-400">{distribution.user?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-white">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                      {formatCurrency(distribution.amount)}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {distribution.description}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {formatDate(distribution.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Distribution Dialog */}
      <Dialog open={showDistributionDialog} onOpenChange={setShowDistributionDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Distribute Profits</DialogTitle>
            <DialogDescription className="text-gray-400">
              Distribute profits to selected users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Distribution Type</label>
              <Select value={distributionType} onValueChange={setDistributionType}>
                <SelectTrigger className="mt-2 bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="individual">Individual Amount</SelectItem>
                  <SelectItem value="equal">Equal Split</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">
                Amount per User ({distributionType === 'equal' ? 'Total will be split equally' : 'Fixed amount per user'})
              </label>
              <Input
                type="number"
                value={distributionAmount}
                onChange={(e) => setDistributionAmount(e.target.value)}
                placeholder="Enter amount..."
                className="mt-2 bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Weekly profit distribution, Monthly earnings..."
                className="mt-2 bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Selected Users:</span>
                <Badge variant="secondary">{selectedUsers.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Total Amount:</span>
                <span className="text-white font-medium">
                  {distributionAmount && selectedUsers.length > 0
                    ? formatCurrency(parseFloat(distributionAmount) * selectedUsers.length)
                    : '$0'}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowDistributionDialog(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDistributeProfits}
                disabled={processing || selectedUsers.length === 0 || !distributionAmount || !description}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? 'Processing...' : 'Distribute Profits'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProfits; 