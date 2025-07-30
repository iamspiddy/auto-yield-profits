import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { toast } from '@/components/ui/use-toast';
import { Search, Filter, CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react';

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  wallet_address: string;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  transaction_hash: string | null;
  user_email?: string;
  user_name?: string;
};

const WithdrawalsManagement = () => {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('pending');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, [filter, dateFilter]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('withdrawals')
        .select('*');
      
      // Apply status filter
      if (filter !== 'all') {
        query = query.eq('status', filter as any);
      }
      
      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            startDate = null;
        }
        
        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }
      }
      
      // Order by creation date
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Format the data to include user information
      const formattedData = data?.map((item: any) => ({
        ...item,
        user_email: 'Loading...', // We'll add this back later
        user_name: 'Loading...'   // We'll add this back later
      })) || [];

      setWithdrawals(formattedData);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load withdrawals. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const openWithdrawalDetails = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setReviewNotes(withdrawal.notes || '');
    setTransactionHash(withdrawal.transaction_hash || '');
    setDetailsOpen(true);
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    if (!transactionHash.trim()) {
      toast({
        variant: 'destructive',
        title: 'Transaction Hash Required',
        description: 'Please enter a transaction hash to approve this withdrawal.',
      });
      return;
    }
    
    try {
      setProcessingAction(true);
      
      // 1. Update withdrawal status
      const { error: updateError } = await supabase
        .from('withdrawals')
        .update({
          status: 'completed',
          notes: reviewNotes,
          transaction_hash: transactionHash,
          processed_at: new Date().toISOString(),
          processed_by: user?.id
        })
        .eq('id', withdrawalId);

      if (updateError) throw updateError;

      // 2. Get withdrawal details for transaction creation
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('id', withdrawalId)
        .single();

      if (withdrawalError) throw withdrawalError;

      // 3. Create a transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: withdrawalData.user_id,
          amount: withdrawalData.amount,
          currency: withdrawalData.currency,
          type: 'withdrawal',
          status: 'completed', // This maps correctly: withdrawal 'completed' -> transaction 'completed'
          reference_id: withdrawalId,
          description: 'Withdrawal completed'
        });

      if (transactionError) throw transactionError;

      toast({
        title: 'Withdrawal Approved',
        description: 'The withdrawal has been marked as completed.',
      });

      // Refresh withdrawals list
      fetchWithdrawals();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve withdrawal. Please try again.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    try {
      setProcessingAction(true);
      
      const { error } = await supabase
        .from('withdrawals')
        .update({
          status: 'rejected',
          notes: reviewNotes,
          processed_at: new Date().toISOString(),
          processed_by: user?.id
        })
        .eq('id', withdrawalId);

      if (error) throw error;

      toast({
        title: 'Withdrawal Rejected',
        description: 'The withdrawal has been rejected.',
      });

      fetchWithdrawals();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject withdrawal. Please try again.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleMarkAsProcessing = async (withdrawalId: string) => {
    try {
      setProcessingAction(true);
      
      const { error } = await supabase
        .from('withdrawals')
        .update({
          status: 'processing',
          notes: reviewNotes,
          processed_at: new Date().toISOString(),
          processed_by: user?.id
        })
        .eq('id', withdrawalId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: 'The withdrawal has been marked as processing.',
      });

      fetchWithdrawals();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update withdrawal status. Please try again.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const matchesSearch = 
      withdrawal.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.wallet_address.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    // Handle cryptocurrency codes that aren't valid ISO currency codes
    if (currency === 'USDT' || currency === 'BTC' || currency === 'ETH') {
      return `$${amount.toFixed(2)} ${currency}`;
    }
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    } catch (error) {
      // Fallback for invalid currency codes
      return `$${amount.toFixed(2)} ${currency}`;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      case 'processing':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Withdrawal Management</h1>
        <p className="text-muted-foreground">
          Process and track user withdrawal requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Withdrawals</CardTitle>
              <CardDescription>
                {filter === 'all' ? 'All withdrawals' : 
                 filter === 'pending' ? 'Pending approval' : 
                 filter === 'processing' ? 'Processing withdrawals' :
                 filter === 'completed' ? 'Completed withdrawals' : 
                 'Rejected withdrawals'}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search withdrawals..."
                  className="pl-8 w-full md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={filter}
                  onValueChange={setFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Withdrawals</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={dateFilter}
                  onValueChange={setDateFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
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
          ) : filteredWithdrawals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No withdrawals found matching your criteria
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-medium">
                        <div>{withdrawal.user_name}</div>
                        <div className="text-xs text-muted-foreground">{withdrawal.user_email}</div>
                      </TableCell>
                      <TableCell>{formatDate(withdrawal.created_at)}</TableCell>
                      <TableCell>{formatCurrency(withdrawal.amount, withdrawal.currency)}</TableCell>
                      <TableCell>
                        <div className="font-mono text-xs truncate max-w-[150px]" title={withdrawal.wallet_address}>
                          {withdrawal.wallet_address}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(withdrawal.status)}>
                          {withdrawal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openWithdrawalDetails(withdrawal)}
                        >
                          {withdrawal.status === 'pending' ? 'Process' : 'Details'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Details Modal */}
      {selectedWithdrawal && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Withdrawal Details</DialogTitle>
              <DialogDescription>
                ID: {selectedWithdrawal.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">User</h4>
                  <p>{selectedWithdrawal.user_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedWithdrawal.user_email}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Amount</h4>
                  <p>{formatCurrency(selectedWithdrawal.amount, selectedWithdrawal.currency)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Date</h4>
                  <p>{formatDate(selectedWithdrawal.created_at)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  <Badge variant={getStatusBadgeVariant(selectedWithdrawal.status)}>
                    {selectedWithdrawal.status}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Wallet Address</h4>
                <p className="font-mono text-xs break-all">{selectedWithdrawal.wallet_address}</p>
              </div>

              {(selectedWithdrawal.status === 'pending' || selectedWithdrawal.status === 'processing') && (
                <>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Admin Notes</h4>
                    <Textarea
                      placeholder="Add notes about this withdrawal..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                  </div>

                  {selectedWithdrawal.status === 'processing' && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Transaction Hash</h4>
                      <Input
                        placeholder="Enter blockchain transaction hash..."
                        value={transactionHash}
                        onChange={(e) => setTransactionHash(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              {(selectedWithdrawal.status === 'completed' || selectedWithdrawal.status === 'rejected') && (
                <>
                  {selectedWithdrawal.notes && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Admin Notes</h4>
                      <p className="text-sm">{selectedWithdrawal.notes}</p>
                    </div>
                  )}
                  
                  {selectedWithdrawal.transaction_hash && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Transaction Hash</h4>
                      <p className="text-sm font-mono break-all">{selectedWithdrawal.transaction_hash}</p>
                    </div>
                  )}

                  {selectedWithdrawal.processed_at && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Processed On</h4>
                      <p className="text-sm">{formatDate(selectedWithdrawal.processed_at)}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedWithdrawal.status === 'pending' && (
              <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                <Button
                  variant="destructive"
                  onClick={() => handleRejectWithdrawal(selectedWithdrawal.id)}
                  disabled={processingAction}
                  className="w-full sm:w-auto"
                >
                  {processingAction ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleMarkAsProcessing(selectedWithdrawal.id)}
                  disabled={processingAction}
                  className="w-full sm:w-auto"
                >
                  {processingAction ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Mark as Processing</>
                  )}
                </Button>
              </DialogFooter>
            )}

            {selectedWithdrawal.status === 'processing' && (
              <DialogFooter className="flex justify-between">
                <Button
                  variant="destructive"
                  onClick={() => handleRejectWithdrawal(selectedWithdrawal.id)}
                  disabled={processingAction}
                >
                  {processingAction ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApproveWithdrawal(selectedWithdrawal.id)}
                  disabled={processingAction || !transactionHash.trim()}
                >
                  {processingAction ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </>
                  )}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default WithdrawalsManagement;