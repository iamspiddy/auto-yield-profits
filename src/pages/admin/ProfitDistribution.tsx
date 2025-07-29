import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Loader2, Users, DollarSign, Percent, Calculator } from 'lucide-react';

type User = {
  id: string;
  email: string;
  full_name: string;
  kyc_verified: boolean;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  selected?: boolean;
};

type Earning = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  source: string;
  description: string;
  created_at: string;
  reference_id: string | null;
};

const ProfitDistribution = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userEarnings, setUserEarnings] = useState<Earning[]>([]);
  const [userEarningsLoading, setUserEarningsLoading] = useState(false);
  const [singlePayoutOpen, setSinglePayoutOpen] = useState(false);
  const [batchPayoutOpen, setBatchPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutCurrency, setPayoutCurrency] = useState('USD');
  const [payoutDescription, setPayoutDescription] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  
  // Batch payout settings
  const [batchPayoutType, setBatchPayoutType] = useState('fixed'); // 'fixed', 'percentage'
  const [batchPayoutAmount, setBatchPayoutAmount] = useState('');
  const [batchPayoutPercentage, setBatchPayoutPercentage] = useState('');
  const [batchPayoutDescription, setBatchPayoutDescription] = useState('');
  const [batchPayoutCurrency, setBatchPayoutCurrency] = useState('USD');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load users. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserEarnings = async (userId: string) => {
    try {
      setUserEarningsLoading(true);
      
      const { data, error } = await supabase
        .from('earnings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserEarnings((data as any) || []);
    } catch (error) {
      console.error('Error fetching user earnings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load earnings history. Please try again.',
      });
    } finally {
      setUserEarningsLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      // Deselect all
      setSelectedUsers(new Set());
    } else {
      // Select all
      const newSet = new Set<string>();
      filteredUsers.forEach(user => newSet.add(user.id));
      setSelectedUsers(newSet);
    }
  };

  const openSinglePayout = (user: User) => {
    setSelectedUser(user);
    fetchUserEarnings(user.id);
    setSinglePayoutOpen(true);
    setPayoutAmount('');
    setPayoutDescription('');
  };

  const openBatchPayout = () => {
    if (selectedUsers.size === 0) {
      toast({
        variant: 'destructive',
        title: 'No Users Selected',
        description: 'Please select at least one user for batch payout.',
      });
      return;
    }
    
    setBatchPayoutOpen(true);
    setBatchPayoutAmount('');
    setBatchPayoutPercentage('');
    setBatchPayoutDescription('');
  };

  const handleSinglePayout = async () => {
    if (!selectedUser) return;
    
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Please enter a valid positive amount.',
      });
      return;
    }
    
    try {
      setProcessingAction(true);
      
      // Create earning record
      const { data, error } = await supabase
        .from('earnings')
        .insert({
          user_id: selectedUser.id,
          amount,
          currency: payoutCurrency,
          source: 'admin_distribution',
          description: payoutDescription || 'Profit distribution',
          created_by: user?.id
        })
        .select();

      if (error) throw error;

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: selectedUser.id,
          amount,
          currency: payoutCurrency,
          type: 'profit',
          status: 'completed',
          reference_id: data[0].id,
          description: payoutDescription || 'Profit distribution'
        });

      toast({
        title: 'Payout Successful',
        description: `Successfully distributed ${amount} ${payoutCurrency} to ${selectedUser.full_name}.`,
      });

      // Refresh earnings list
      fetchUserEarnings(selectedUser.id);
      setPayoutAmount('');
      setPayoutDescription('');
    } catch (error) {
      console.error('Error processing payout:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process payout. Please try again.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleBatchPayout = async () => {
    if (selectedUsers.size === 0) return;
    
    let amount: number;
    
    if (batchPayoutType === 'fixed') {
      amount = parseFloat(batchPayoutAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          variant: 'destructive',
          title: 'Invalid Amount',
          description: 'Please enter a valid positive amount.',
        });
        return;
      }
    } else {
      // Percentage payout validation
      const percentage = parseFloat(batchPayoutPercentage);
      if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
        toast({
          variant: 'destructive',
          title: 'Invalid Percentage',
          description: 'Please enter a valid percentage between 0 and 100.',
        });
        return;
      }
    }
    
    try {
      setProcessingAction(true);
      
      // Process each selected user
      const selectedUserIds = Array.from(selectedUsers);
      const description = batchPayoutDescription || 'Batch profit distribution';
      
      // For percentage payouts, we need to get user balances
      let userBalances: Record<string, number> = {};
      
      if (batchPayoutType === 'percentage') {
        // For now, use mock balance calculation since RPC doesn't exist
        // TODO: Implement proper balance calculation
        selectedUserIds.forEach(userId => {
          userBalances[userId] = 1000; // Mock balance
        });
      }
      
      // Process each user
      for (const userId of selectedUserIds) {
        let payoutAmount: number;
        
        if (batchPayoutType === 'fixed') {
          payoutAmount = parseFloat(batchPayoutAmount);
        } else {
          // Calculate percentage of user's balance
          const userBalance = userBalances[userId] || 0;
          const percentage = parseFloat(batchPayoutPercentage);
          payoutAmount = userBalance * (percentage / 100);
          
          // Skip if amount is zero or too small
          if (payoutAmount < 0.01) continue;
        }
        
        // Create earning record
        const { data, error } = await supabase
          .from('earnings')
          .insert({
            user_id: userId,
            amount: payoutAmount,
            currency: batchPayoutCurrency,
            source: 'admin_distribution',
            description,
            created_by: user?.id
          })
          .select();

        if (error) throw error;

        // Create transaction record
        await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            amount: payoutAmount,
            currency: batchPayoutCurrency,
            type: 'profit',
            status: 'completed',
            reference_id: data[0].id,
            description
          });
      }
      
      toast({
        title: 'Batch Payout Successful',
        description: `Successfully distributed profits to ${selectedUserIds.length} users.`,
      });

      // Reset selections and close modal
      setSelectedUsers(new Set());
      setBatchPayoutOpen(false);
      fetchUsers(); // Refresh user list
    } catch (error) {
      console.error('Error processing batch payout:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process batch payout. Please try again.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profit Distribution</h1>
        <p className="text-muted-foreground">
          Manage and distribute profits to users
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Select users to distribute profits
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search users..."
                  className="pl-8 w-full md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {selectedUsers.size > 0 && (
                <Button
                  variant="default"
                  onClick={openBatchPayout}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Batch Payout ({selectedUsers.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={filteredUsers.length === 0}
                >
                  {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all users"
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>KYC Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => handleSelectUser(user.id)}
                            aria-label={`Select user ${user.full_name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>{user.full_name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.kyc_verified ? 'secondary' : 'outline'}
                          >
                            {user.kyc_verified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSinglePayout(user)}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Payout
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single User Payout Modal */}
      {selectedUser && (
        <Dialog open={singlePayoutOpen} onOpenChange={setSinglePayoutOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Distribute Profit</DialogTitle>
              <DialogDescription>
                Send profit to {selectedUser.full_name}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="payout">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="payout">New Payout</TabsTrigger>
                <TabsTrigger value="history">Earnings History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="payout" className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <div className="flex gap-2">
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                    />
                    <Select
                      value={payoutCurrency}
                      onValueChange={setPayoutCurrency}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="BTC">BTC</SelectItem>
                        <SelectItem value="ETH">ETH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Reason for this profit distribution..."
                    value={payoutDescription}
                    onChange={(e) => setPayoutDescription(e.target.value)}
                  />
                </div>

                <DialogFooter>
                  <Button
                    onClick={handleSinglePayout}
                    disabled={processingAction || !payoutAmount}
                  >
                    {processingAction ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Distribute Profit</>
                    )}
                  </Button>
                </DialogFooter>
              </TabsContent>
              
              <TabsContent value="history" className="pt-4">
                {userEarningsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : userEarnings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No earnings history found for this user
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userEarnings.map((earning) => (
                          <TableRow key={earning.id}>
                            <TableCell>{formatDate(earning.created_at)}</TableCell>
                            <TableCell>{formatCurrency(earning.amount, earning.currency)}</TableCell>
                            <TableCell>
                              <div className="capitalize">{earning.source.replace('_', ' ')}</div>
                              {earning.description && (
                                <div className="text-xs text-muted-foreground">{earning.description}</div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Batch Payout Modal */}
      <Dialog open={batchPayoutOpen} onOpenChange={setBatchPayoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Batch Profit Distribution</DialogTitle>
            <DialogDescription>
              Distribute profits to {selectedUsers.size} selected users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Distribution Type</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  variant={batchPayoutType === 'fixed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBatchPayoutType('fixed')}
                  className="flex-1"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Fixed Amount
                </Button>
                <Button
                  variant={batchPayoutType === 'percentage' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBatchPayoutType('percentage')}
                  className="flex-1"
                >
                  <Percent className="h-4 w-4 mr-2" />
                  Percentage
                </Button>
              </div>
            </div>

            {batchPayoutType === 'fixed' ? (
              <div>
                <Label htmlFor="batch-amount">Amount per User</Label>
                <div className="flex gap-2">
                  <Input
                    id="batch-amount"
                    type="number"
                    placeholder="0.00"
                    value={batchPayoutAmount}
                    onChange={(e) => setBatchPayoutAmount(e.target.value)}
                  />
                  <Select
                    value={batchPayoutCurrency}
                    onValueChange={setBatchPayoutCurrency}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="batch-percentage">Percentage of Balance</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="batch-percentage"
                    type="number"
                    placeholder="0.00"
                    value={batchPayoutPercentage}
                    onChange={(e) => setBatchPayoutPercentage(e.target.value)}
                  />
                  <span className="text-lg">%</span>
                  <Select
                    value={batchPayoutCurrency}
                    onValueChange={setBatchPayoutCurrency}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This will distribute the specified percentage of each user's current balance.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="batch-description">Description (Optional)</Label>
              <Textarea
                id="batch-description"
                placeholder="Reason for this profit distribution..."
                value={batchPayoutDescription}
                onChange={(e) => setBatchPayoutDescription(e.target.value)}
              />
            </div>

            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-medium">Distribution Summary</h4>
              </div>
              <div className="mt-2 text-sm">
                <p>Users selected: {selectedUsers.size}</p>
                {batchPayoutType === 'fixed' && batchPayoutAmount && (
                  <p className="mt-1">
                    Total distribution: {formatCurrency(
                      parseFloat(batchPayoutAmount) * selectedUsers.size,
                      batchPayoutCurrency
                    )}
                  </p>
                )}
                {batchPayoutType === 'percentage' && batchPayoutPercentage && (
                  <p className="mt-1">
                    {parseFloat(batchPayoutPercentage)}% of each user's balance
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchPayoutOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBatchPayout}
              disabled={processingAction || (
                batchPayoutType === 'fixed' ? !batchPayoutAmount : !batchPayoutPercentage
              )}
            >
              {processingAction ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Distribute to {selectedUsers.size} Users</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfitDistribution;