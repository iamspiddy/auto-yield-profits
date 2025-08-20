import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Wallet,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  AlertCircle,
  DollarSign,
  User,
  Calendar,
  ExternalLink,
  Copy
} from 'lucide-react';

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  wallet_address: string;
  bank_info: any;
  notes: string | null;
  withdrawal_type: string;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  transaction_hash: string | null;
  user?: {
    email: string;
    full_name: string;
  };
}

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  useEffect(() => {
    filterWithdrawals();
  }, [withdrawals, searchTerm, statusFilter]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);

      const { data: withdrawalsData, error } = await supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately to avoid relationship issues
      const withdrawalsWithUsers = await Promise.all(
        withdrawalsData.map(async (withdrawal) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', withdrawal.user_id)
            .single();

          return {
            ...withdrawal,
            user: profile || { email: 'Unknown', full_name: 'Unknown User' }
          };
        })
      );

      setWithdrawals(withdrawalsWithUsers);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        title: "Error",
        description: "Failed to load withdrawals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterWithdrawals = () => {
    let filtered = withdrawals;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(withdrawal =>
        withdrawal.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(withdrawal => withdrawal.status === statusFilter);
    }

    setFilteredWithdrawals(filtered);
  };

  const handleMarkAsPaid = async (withdrawalId: string) => {
    if (!user) return;

    try {
      setProcessing(true);

      console.log('Updating withdrawal:', withdrawalId, 'to completed status');
      
      const { data: updateData, error } = await supabase
        .from('withdrawals')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          transaction_hash: transactionHash || null,
          notes: transactionHash ? `Transaction hash: ${transactionHash}` : null
        })
        .eq('id', withdrawalId)
        .select();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      
      console.log('Update result:', updateData);

      // Get withdrawal details for balance update
      const withdrawal = withdrawals.find(w => w.id === withdrawalId);
      if (!withdrawal) throw new Error('Withdrawal not found');

      // Handle balance update based on withdrawal type
      if (withdrawal.withdrawal_type === 'wallet') {
        // Decrement user wallet balance (deposited funds)
        console.log('Decrementing user wallet balance...');
        const { data: balanceData, error: balanceError } = await supabase
          .rpc('decrement_balance', {
            user_id_param: withdrawal.user_id,
            amount_param: withdrawal.amount
          });

        if (balanceError) {
          console.error('Balance update error:', balanceError);
          throw balanceError;
        }
        console.log('Wallet balance decremented successfully. New balance:', balanceData);
      } else if (withdrawal.withdrawal_type === 'earnings') {
        // For earnings withdrawals, we need to track the deduction
        console.log('Processing earnings withdrawal - creating deduction record...');
        
        // Create a withdrawal deduction record
        const { error: deductionError } = await supabase
          .from('withdrawal_deductions')
          .insert({
            user_id: withdrawal.user_id,
            withdrawal_id: withdrawalId,
            amount: withdrawal.amount
          });

        if (deductionError) {
          console.error('Deduction record error:', deductionError);
          throw deductionError;
        }
        
        console.log('Withdrawal deduction record created successfully');
      }

      // Transaction record was already created by the trigger when withdrawal was first created
      // No need to create another one to avoid duplicate key violations
      console.log('Withdrawal marked as paid - transaction already exists from initial creation');

      toast({
        title: "Withdrawal Processed",
        description: `Withdrawal of ${formatCurrency(selectedWithdrawal?.amount || 0)} has been marked as paid`,
      });

      setPaymentDialogOpen(false);
      setTransactionHash('');
      fetchWithdrawals(); // Refresh data
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: "Error",
        description: "Failed to process withdrawal",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    if (!user) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from('withdrawals')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          notes: rejectionReason
        })
        .eq('id', withdrawalId);

      if (error) throw error;

      // Refund the user's balance based on withdrawal type
      const withdrawal = withdrawals.find(w => w.id === withdrawalId);
      if (withdrawal) {
        if (withdrawal.withdrawal_type === 'wallet') {
          // Refund to wallet balance for wallet withdrawals
          const { error: balanceError } = await supabase
            .rpc('increment_balance', {
              user_id_param: withdrawal.user_id,
              amount_param: withdrawal.amount
            });

          if (balanceError) throw balanceError;
        } else if (withdrawal.withdrawal_type === 'earnings') {
          // For earnings withdrawals, we don't refund to wallet balance
          // The earnings remain available for future withdrawals
          console.log('Earnings withdrawal rejected - no wallet balance refund needed');
        }

        // Create transaction record for refund
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: withdrawal.user_id,
            amount: withdrawal.amount,
            type: 'deposit', // Refund as deposit
            status: 'completed',
            description: `Withdrawal rejected and refunded: ${rejectionReason}`,
            reference_id: withdrawalId
          });

        if (transactionError) throw transactionError;
      }

      toast({
        title: "Withdrawal Rejected",
        description: "Withdrawal has been rejected and user balance refunded",
      });

      setRejectionDialogOpen(false);
      setRejectionReason('');
      fetchWithdrawals(); // Refresh data
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast({
        title: "Error",
        description: "Failed to reject withdrawal",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    });
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

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      rejected: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const getPendingWithdrawalsCount = () => {
    return withdrawals.filter(w => w.status === 'pending').length;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Withdrawal Management</h1>
          <p className="text-gray-400 mt-2">Process withdrawal requests and payments</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="w-full sm:w-auto text-center">{getPendingWithdrawalsCount()} pending</Badge>
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
                  placeholder="Search by user email, name, or withdrawal ID..."
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
                <SelectItem value="all">All Withdrawals</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Withdrawals</CardTitle>
          <CardDescription className="text-gray-400">
            Process withdrawal requests and track payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Amount</TableHead>
                  <TableHead className="text-gray-300 hidden sm:table-cell">Type</TableHead>
                  <TableHead className="text-gray-300 hidden md:table-cell">Destination</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300 hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id} className="border-gray-700">
                  <TableCell>
                    <div>
                      <div className="font-medium text-white">{withdrawal.user?.full_name}</div>
                      <div className="text-sm text-gray-400">{withdrawal.user?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-white">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-red-500 mr-1" />
                      {formatCurrency(withdrawal.amount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={withdrawal.withdrawal_type === 'wallet' ? 'default' : 'secondary'}>
                      {withdrawal.withdrawal_type === 'wallet' ? 'Wallet' : 'Earnings'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-300 text-sm truncate">
                          {withdrawal.wallet_address}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(withdrawal.wallet_address)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(withdrawal.status)}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {formatDate(withdrawal.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {withdrawal.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setPaymentDialogOpen(true);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setRejectionDialogOpen(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-800 border-gray-700">
                          <DialogHeader>
                            <DialogTitle className="text-white">Withdrawal Details</DialogTitle>
                            <DialogDescription className="text-gray-400">
                              View detailed withdrawal information
                            </DialogDescription>
                          </DialogHeader>
                          {withdrawal && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-300">User</label>
                                  <p className="text-white">{withdrawal.user?.full_name}</p>
                                  <p className="text-gray-400 text-sm">{withdrawal.user?.email}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Amount</label>
                                  <p className="text-white">{formatCurrency(withdrawal.amount)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Status</label>
                                  <div className="mt-1">{getStatusBadge(withdrawal.status)}</div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Date</label>
                                  <p className="text-white">{formatDate(withdrawal.created_at)}</p>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-300">Destination Address</label>
                                <div className="flex items-center space-x-2 mt-1">
                                  <p className="text-white font-mono text-sm">{withdrawal.wallet_address}</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(withdrawal.wallet_address)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              {withdrawal.notes && (
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Notes</label>
                                  <p className="text-white mt-1">{withdrawal.notes}</p>
                                </div>
                              )}
                              {withdrawal.transaction_hash && (
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Transaction Hash</label>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <p className="text-white font-mono text-sm">{withdrawal.transaction_hash}</p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyToClipboard(withdrawal.transaction_hash!)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
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

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Mark as Paid</DialogTitle>
            <DialogDescription className="text-gray-400">
              Confirm that the withdrawal has been processed and paid
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedWithdrawal && (
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Amount:</span>
                  <span className="text-white font-medium">{formatCurrency(selectedWithdrawal.amount)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">User:</span>
                  <span className="text-white">{selectedWithdrawal.user?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Address:</span>
                  <span className="text-white font-mono text-sm">{selectedWithdrawal.wallet_address}</span>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-300">Transaction Hash (Optional)</label>
              <Input
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
                placeholder="Enter blockchain transaction hash..."
                className="mt-2 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedWithdrawal && handleMarkAsPaid(selectedWithdrawal.id)}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? 'Processing...' : 'Mark as Paid'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Withdrawal</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to reject this withdrawal? The user's balance will be refunded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedWithdrawal && (
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Amount:</span>
                  <span className="text-white font-medium">{formatCurrency(selectedWithdrawal.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">User:</span>
                  <span className="text-white">{selectedWithdrawal.user?.email}</span>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-300">Rejection Reason (Required)</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="mt-2 bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setRejectionDialogOpen(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedWithdrawal && handleRejectWithdrawal(selectedWithdrawal.id)}
                disabled={processing || !rejectionReason.trim()}
                variant="destructive"
              >
                {processing ? 'Processing...' : 'Reject & Refund'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWithdrawals; 