import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, Eye, DollarSign, Plus, AlertTriangle, Filter, User } from 'lucide-react';
import { getBadgeVariant } from '@/lib/badgeUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  kyc_verified: boolean;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  balance: number;
}

interface UserDetails {
  user_id: string;
  full_name: string;
  email: string;
  kyc_verified: boolean;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  balance: number;
  deposits: any[];
  withdrawals: any[];
  earnings: any[];
}

const UsersManagement = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [showManualDepositDialog, setShowManualDepositDialog] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [manualDepositForm, setManualDepositForm] = useState({
    amount: '',
    reason: '',
    currency: 'USDT',
    transactionHash: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, kyc_verified, referral_code, referred_by, created_at, balance');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setUserDetailsLoading(true);
    try {
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch user deposits
      const { data: deposits } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Fetch user withdrawals
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Fetch user earnings
      const { data: earnings } = await supabase
        .from('earnings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Calculate balance from deposits, withdrawals, and earnings
      const totalDeposits = (deposits || [])
        .filter(d => d.status === 'approved')
        .reduce((sum, d) => sum + Number(d.amount), 0);
      
      const totalWithdrawals = (withdrawals || [])
        .filter(w => w.status === 'completed')
        .reduce((sum, w) => sum + Number(w.amount), 0);
      
      const totalEarnings = (earnings || []).reduce((sum, e) => sum + Number(e.amount), 0);
      
      const calculatedBalance = totalDeposits + totalEarnings - totalWithdrawals;

      setSelectedUser({
        ...profile,
        balance: profile.balance || calculatedBalance,
        deposits: deposits || [],
        withdrawals: withdrawals || [],
        earnings: earnings || []
      });

    } catch (error) {
      console.error('Error fetching user details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch user details",
        variant: "destructive"
      });
    } finally {
      setUserDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'verified' && !user.kyc_verified) return false;
    if (filter === 'unverified' && user.kyc_verified) return false;
    if (filter === 'referred' && !user.referred_by) return false;
    
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleManualDeposit = () => {
    if (!selectedUser) return;
    setShowManualDepositDialog(true);
  };

  const handleManualDepositSubmit = () => {
    if (!manualDepositForm.amount || !manualDepositForm.reason || !selectedUser) {
      toast({
        title: "Error",
        description: "Amount and reason are required",
        variant: "destructive"
      });
      return;
    }
    setShowManualDepositDialog(false);
    setShowConfirmationDialog(true);
  };

  const handleConfirmManualDeposit = async () => {
    if (!selectedUser || !currentUser) return;
    
    setSubmitting(true);
    
    try {
      const amount = parseFloat(manualDepositForm.amount);
      
      // 1. Create deposit record
      const { data: depositData, error: depositError } = await supabase
        .from('deposits')
        .insert({
          user_id: selectedUser.user_id,
          amount: amount,
          currency: manualDepositForm.currency,
          status: 'approved',
          transaction_hash: manualDepositForm.transactionHash || null,
          notes: `Manual deposit by admin: ${manualDepositForm.reason}`,
          verified_by: currentUser.id,
          verified_at: new Date().toISOString()
        })
        .select()
        .single();

      if (depositError) throw depositError;

      // 2. Update user balance
      const newBalance = (selectedUser.balance || 0) + amount;
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('user_id', selectedUser.user_id);

      if (balanceError) throw balanceError;

      // 3. Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: selectedUser.user_id,
          type: 'deposit',
          amount: amount,
          currency: manualDepositForm.currency,
          status: 'completed',
          reference_id: depositData.id,
          description: `Manual deposit: ${manualDepositForm.reason}`
        });

      if (transactionError) throw transactionError;

      // 4. Log admin action
      const { error: logError } = await supabase
        .from('admin_actions')
        .insert({
          admin_id: currentUser.id,
          action_type: 'manual_deposit',
          entity_type: 'balance',
          entity_id: selectedUser.user_id,
          amount: amount,
          reason: manualDepositForm.reason,
          details: {
            currency: manualDepositForm.currency,
            transaction_hash: manualDepositForm.transactionHash,
            previous_balance: selectedUser.balance || 0,
            new_balance: newBalance
          }
        });

      if (logError) throw logError;

      // Update local state
      setSelectedUser({
        ...selectedUser,
        balance: newBalance
      });

      // Refresh users list
      fetchUsers();

      toast({
        title: "Success",
        description: `Successfully added ${formatCurrency(amount)} to ${selectedUser.full_name}'s balance`,
      });

      // Reset form
      setManualDepositForm({
        amount: '',
        reason: '',
        currency: 'USDT',
        transactionHash: ''
      });

    } catch (error: any) {
      console.error('Error processing manual deposit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process manual deposit",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
      setShowConfirmationDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          View and manage all users on the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Total users: {users.length}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name or email..."
                  className="pl-8 w-full md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="verified">KYC Verified</SelectItem>
                    <SelectItem value="unverified">Not Verified</SelectItem>
                    <SelectItem value="referred">Referred Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Referral Code</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{formatCurrency(user.balance || 0)}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(user.kyc_verified ? "success" : "secondary")}>
                        {user.kyc_verified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{user.referral_code}</TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => fetchUserDetails(user.user_id)}
                        size="sm"
                        variant="outline"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedUser.full_name}
                </DialogTitle>
                <DialogDescription>
                  {selectedUser.email} · Joined {formatDate(selectedUser.created_at)}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="deposits">Deposits</TabsTrigger>
                  <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                  <TabsTrigger value="earnings">Earnings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="grid grid-cols-2 gap-4 flex-1">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Balance</p>
                        <p className="text-2xl font-bold">{formatCurrency(selectedUser.balance || 0)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">KYC Status</p>
                        <Badge variant={getBadgeVariant(selectedUser.kyc_verified ? "success" : "secondary")}>
                          {selectedUser.kyc_verified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Referral Code</p>
                        <p className="font-mono">{selectedUser.referral_code}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Referred By</p>
                        <p>{selectedUser.referred_by || 'None'}</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleManualDeposit}
                      className="ml-4"
                      variant="default"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Manual Deposit
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="deposits" className="space-y-4">
                  {selectedUser.deposits.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No deposits found</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUser.deposits.map((deposit) => (
                          <TableRow key={deposit.id}>
                            <TableCell>{formatDate(deposit.created_at)}</TableCell>
                            <TableCell>{formatCurrency(deposit.amount)}</TableCell>
                            <TableCell>{deposit.currency}</TableCell>
                            <TableCell>
                              <Badge variant={getBadgeVariant(deposit.status)}>
                                {deposit.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{deposit.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="withdrawals" className="space-y-4">
                  {selectedUser.withdrawals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No withdrawals found</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Wallet Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUser.withdrawals.map((withdrawal) => (
                          <TableRow key={withdrawal.id}>
                            <TableCell>{formatDate(withdrawal.created_at)}</TableCell>
                            <TableCell>{formatCurrency(withdrawal.amount)}</TableCell>
                            <TableCell>{withdrawal.currency}</TableCell>
                            <TableCell>
                              <Badge variant={getBadgeVariant(withdrawal.status)}>
                                {withdrawal.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm max-w-xs truncate">
                              {withdrawal.wallet_address}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="earnings" className="space-y-4">
                  {selectedUser.earnings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No earnings found</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Currency</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUser.earnings.map((earning) => (
                          <TableRow key={earning.id}>
                            <TableCell>{formatDate(earning.earnings_date)}</TableCell>
                            <TableCell>{formatCurrency(earning.amount)}</TableCell>
                            <TableCell>{earning.currency}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Deposit Dialog */}
      <Dialog open={showManualDepositDialog} onOpenChange={setShowManualDepositDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Deposit</DialogTitle>
            <DialogDescription>
              Add funds to {selectedUser?.full_name}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={manualDepositForm.amount}
                onChange={(e) => setManualDepositForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={manualDepositForm.currency}
                onValueChange={(value) => setManualDepositForm(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transactionHash">Transaction Hash (Optional)</Label>
              <Input
                id="transactionHash"
                placeholder="0x..."
                value={manualDepositForm.transactionHash}
                onChange={(e) => setManualDepositForm(prev => ({ ...prev, transactionHash: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason / Notes *</Label>
              <Textarea
                id="reason"
                placeholder="e.g., USDT received from wallet 0xABC... on 7/30"
                value={manualDepositForm.reason}
                onChange={(e) => setManualDepositForm(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setShowManualDepositDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleManualDepositSubmit}
                className="flex-1"
                disabled={!manualDepositForm.amount || !manualDepositForm.reason}
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm Manual Deposit
            </DialogTitle>
            <DialogDescription>
              Please review the details before confirming this balance update.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">User:</span>
                <span>{selectedUser?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">User ID:</span>
                <span className="font-mono text-sm">{selectedUser?.user_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Current Balance:</span>
                <span>{formatCurrency(selectedUser?.balance || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Amount to Add:</span>
                <span className="text-green-600 font-bold">
                  +{formatCurrency(parseFloat(manualDepositForm.amount || '0'))} {manualDepositForm.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">New Balance:</span>
                <span className="font-bold">
                  {formatCurrency((selectedUser?.balance || 0) + parseFloat(manualDepositForm.amount || '0'))}
                </span>
              </div>
              <div className="pt-2 border-t">
                <span className="font-medium">Reason:</span>
                <p className="text-sm mt-1">{manualDepositForm.reason}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowConfirmationDialog(false)}
                variant="outline"
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmManualDeposit}
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Update'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;