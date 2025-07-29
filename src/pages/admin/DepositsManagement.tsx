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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Search, Filter, Image, CheckCircle, XCircle, Loader2 } from 'lucide-react';

type Deposit = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  proof_file_url: string | null;
  notes: string | null;
  created_at: string;
  verified_at: string | null;
  verified_by: string | null;
  transaction_hash: string | null;
  user_email?: string;
  user_name?: string;
};

const DepositsManagement = () => {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('pending');
  const [selectedDeposits, setSelectedDeposits] = useState<Set<string>>(new Set());
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [proofImageOpen, setProofImageOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    fetchDeposits();
  }, [filter]);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      
      // Join with profiles to get user information
      const { data, error } = await supabase
        .from('deposits')
        .select(`
          *,
          profiles:user_id(email, full_name)
        `)
        .eq(filter !== 'all' ? 'status' : 'id', filter !== 'all' ? filter : deposits[0]?.id || '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format the data to include user information
      const formattedData = data?.map(item => ({
        ...item,
        user_email: item.profiles?.email,
        user_name: item.profiles?.full_name
      })) || [];

      setDeposits(formattedData);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load deposits. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDeposit = (depositId: string) => {
    setSelectedDeposits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(depositId)) {
        newSet.delete(depositId);
      } else {
        newSet.add(depositId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDeposits.size === filteredDeposits.length) {
      // Deselect all
      setSelectedDeposits(new Set());
    } else {
      // Select all
      const newSet = new Set<string>();
      filteredDeposits.forEach(deposit => newSet.add(deposit.id));
      setSelectedDeposits(newSet);
    }
  };

  const openDepositDetails = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setReviewNotes(deposit.notes || '');
    setTransactionHash(deposit.transaction_hash || '');
    setDetailsOpen(true);
  };

  const handleApproveDeposit = async (depositId: string) => {
    try {
      setProcessingAction(true);
      
      // 1. Update deposit status
      const { error: updateError } = await supabase
        .from('deposits')
        .update({
          status: 'approved',
          notes: reviewNotes,
          transaction_hash: transactionHash,
          verified_at: new Date().toISOString(),
          verified_by: user?.id
        })
        .eq('id', depositId);

      if (updateError) throw updateError;

      // 2. Get deposit details for transaction creation
      const { data: depositData, error: depositError } = await supabase
        .from('deposits')
        .select('*')
        .eq('id', depositId)
        .single();

      if (depositError) throw depositError;

      // 3. Create a transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: depositData.user_id,
          amount: depositData.amount,
          currency: depositData.currency,
          type: 'deposit',
          status: 'completed',
          reference_id: depositId,
          description: 'Deposit approved'
        });

      if (transactionError) throw transactionError;

      // 4. Check if user has a referrer to award commission
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('user_id', depositData.user_id)
        .single();

      if (profileError) throw profileError;

      // 5. If user has a referrer, create referral bonus
      if (profileData.referred_by) {
        // Get referral rate (default to 5% if not specified)
        const { data: referralData } = await supabase
          .from('referrals')
          .select('commission_rate')
          .eq('referrer_id', profileData.referred_by)
          .eq('referred_id', depositData.user_id)
          .single();

        const commissionRate = referralData?.commission_rate || 0.05; // 5% default
        const bonusAmount = depositData.amount * commissionRate;

        // Create transaction for referral bonus
        await supabase
          .from('transactions')
          .insert({
            user_id: profileData.referred_by,
            amount: bonusAmount,
            currency: depositData.currency,
            type: 'referral_bonus',
            status: 'completed',
            reference_id: depositId,
            description: `Referral bonus from deposit ${depositId}`
          });

        // Update total earned in referrals table
        await supabase.rpc('increment_referral_earnings', {
          p_referrer_id: profileData.referred_by,
          p_referred_id: depositData.user_id,
          p_amount: bonusAmount
        });
      }

      toast({
        title: 'Deposit Approved',
        description: 'The deposit has been successfully approved.',
      });

      // Refresh deposits list
      fetchDeposits();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error approving deposit:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve deposit. Please try again.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectDeposit = async (depositId: string) => {
    try {
      setProcessingAction(true);
      
      const { error } = await supabase
        .from('deposits')
        .update({
          status: 'rejected',
          notes: reviewNotes,
          verified_at: new Date().toISOString(),
          verified_by: user?.id
        })
        .eq('id', depositId);

      if (error) throw error;

      toast({
        title: 'Deposit Rejected',
        description: 'The deposit has been rejected.',
      });

      fetchDeposits();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject deposit. Please try again.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedDeposits.size === 0) return;
    
    try {
      setProcessingAction(true);
      
      // Process each selected deposit
      for (const depositId of selectedDeposits) {
        await handleApproveDeposit(depositId);
      }
      
      setSelectedDeposits(new Set());
      toast({
        title: 'Batch Approval Complete',
        description: `Successfully approved ${selectedDeposits.size} deposits.`,
      });
    } catch (error) {
      console.error('Error in batch approval:', error);
      toast({
        variant: 'destructive',
        title: 'Batch Processing Error',
        description: 'Some deposits could not be processed. Please check and try again.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedDeposits.size === 0) return;
    
    try {
      setProcessingAction(true);
      
      // Update all selected deposits to rejected
      const { error } = await supabase
        .from('deposits')
        .update({
          status: 'rejected',
          notes: 'Batch rejected by admin',
          verified_at: new Date().toISOString(),
          verified_by: user?.id
        })
        .in('id', Array.from(selectedDeposits));

      if (error) throw error;
      
      setSelectedDeposits(new Set());
      fetchDeposits();
      
      toast({
        title: 'Batch Rejection Complete',
        description: `Successfully rejected ${selectedDeposits.size} deposits.`,
      });
    } catch (error) {
      console.error('Error in batch rejection:', error);
      toast({
        variant: 'destructive',
        title: 'Batch Processing Error',
        description: 'Some deposits could not be processed. Please check and try again.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredDeposits = deposits.filter(deposit => {
    const matchesSearch = 
      deposit.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.id.toLowerCase().includes(searchTerm.toLowerCase());
    
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
        <h1 className="text-3xl font-bold">Deposit Management</h1>
        <p className="text-muted-foreground">
          Review and process deposit requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Deposits</CardTitle>
              <CardDescription>
                {filter === 'all' ? 'All deposits' : 
                 filter === 'pending' ? 'Pending approval' : 
                 filter === 'approved' ? 'Approved deposits' : 
                 'Rejected deposits'}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search deposits..."
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
                    <SelectItem value="all">All Deposits</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
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
          ) : filteredDeposits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No deposits found matching your criteria
            </div>
          ) : (
            <div className="space-y-4">
              {filter === 'pending' && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={filteredDeposits.length === 0}
                  >
                    {selectedDeposits.size === filteredDeposits.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  
                  {selectedDeposits.size > 0 && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleBatchApprove}
                        disabled={processingAction}
                      >
                        {processingAction ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>Approve Selected ({selectedDeposits.size})</>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBatchReject}
                        disabled={processingAction}
                      >
                        {processingAction ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>Reject Selected ({selectedDeposits.size})</>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}
              
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {filter === 'pending' && (
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectedDeposits.size === filteredDeposits.length && filteredDeposits.length > 0}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all deposits"
                          />
                        </TableHead>
                      )}
                      <TableHead>User</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Proof</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeposits.map((deposit) => (
                      <TableRow key={deposit.id}>
                        {filter === 'pending' && (
                          <TableCell>
                            <Checkbox
                              checked={selectedDeposits.has(deposit.id)}
                              onCheckedChange={() => handleSelectDeposit(deposit.id)}
                              aria-label={`Select deposit ${deposit.id}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          <div>{deposit.user_name}</div>
                          <div className="text-xs text-muted-foreground">{deposit.user_email}</div>
                        </TableCell>
                        <TableCell>{formatDate(deposit.created_at)}</TableCell>
                        <TableCell>{formatCurrency(deposit.amount, deposit.currency)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              deposit.status === 'approved' ? 'success' :
                              deposit.status === 'rejected' ? 'destructive' : 'outline'
                            }
                          >
                            {deposit.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {deposit.proof_file_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDeposit(deposit);
                                setProofImageOpen(true);
                              }}
                            >
                              <Image className="h-4 w-4" />
                              <span className="sr-only">View Proof</span>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">No proof</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDepositDetails(deposit)}
                          >
                            {deposit.status === 'pending' ? 'Review' : 'Details'}
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

      {/* Deposit Details Modal */}
      {selectedDeposit && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Deposit Details</DialogTitle>
              <DialogDescription>
                ID: {selectedDeposit.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">User</h4>
                  <p>{selectedDeposit.user_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedDeposit.user_email}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Amount</h4>
                  <p>{formatCurrency(selectedDeposit.amount, selectedDeposit.currency)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Date</h4>
                  <p>{formatDate(selectedDeposit.created_at)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  <Badge
                    variant={
                      selectedDeposit.status === 'approved' ? 'success' :
                      selectedDeposit.status === 'rejected' ? 'destructive' : 'outline'
                    }
                  >
                    {selectedDeposit.status}
                  </Badge>
                </div>
              </div>

              {selectedDeposit.proof_file_url && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Proof Document</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setProofImageOpen(true)}
                  >
                    <Image className="h-4 w-4 mr-2" />
                    View Proof Document
                  </Button>
                </div>
              )}

              {selectedDeposit.status === 'pending' && (
                <>
                  <div>
                    <Label htmlFor="notes">Review Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add notes about this deposit..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="transaction">Transaction Hash (Optional)</Label>
                    <Input
                      id="transaction"
                      placeholder="Enter blockchain transaction hash..."
                      value={transactionHash}
                      onChange={(e) => setTransactionHash(e.target.value)}
                    />
                  </div>
                </>
              )}

              {(selectedDeposit.status === 'approved' || selectedDeposit.status === 'rejected') && (
                <>
                  {selectedDeposit.notes && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Admin Notes</h4>
                      <p className="text-sm">{selectedDeposit.notes}</p>
                    </div>
                  )}
                  
                  {selectedDeposit.transaction_hash && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Transaction Hash</h4>
                      <p className="text-sm font-mono break-all">{selectedDeposit.transaction_hash}</p>
                    </div>
                  )}

                  {selectedDeposit.verified_at && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Processed On</h4>
                      <p className="text-sm">{formatDate(selectedDeposit.verified_at)}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedDeposit.status === 'pending' && (
              <DialogFooter className="flex justify-between">
                <Button
                  variant="destructive"
                  onClick={() => handleRejectDeposit(selectedDeposit.id)}
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
                  onClick={() => handleApproveDeposit(selectedDeposit.id)}
                  disabled={processingAction}
                >
                  {processingAction ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Proof Image Modal */}
      {selectedDeposit && selectedDeposit.proof_file_url && (
        <Dialog open={proofImageOpen} onOpenChange={setProofImageOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Deposit Proof</DialogTitle>
              <DialogDescription>
                Submitted by {selectedDeposit.user_name} on {formatDate(selectedDeposit.created_at)}
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-auto max-h-[70vh] flex justify-center">
              <img
                src={selectedDeposit.proof_file_url}
                alt="Deposit Proof"
                className="max-w-full h-auto object-contain"
              />
            </div>
            {selectedDeposit.status === 'pending' && (
              <DialogFooter className="flex justify-between">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setProofImageOpen(false);
                    openDepositDetails(selectedDeposit);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setProofImageOpen(false);
                    openDepositDetails(selectedDeposit);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DepositsManagement;