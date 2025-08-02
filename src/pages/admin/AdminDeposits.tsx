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
  CreditCard,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Clock,
  AlertCircle,
  DollarSign,
  User,
  Calendar
} from 'lucide-react';

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  proof_file_url: string | null;
  notes: string | null;
  created_at: string;
  verified_at: string | null;
  verified_by: string | null;
  user?: {
    email: string;
    full_name: string;
  };
}

const AdminDeposits = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [filteredDeposits, setFilteredDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchDeposits();
    
    // Test admin permissions
    const testAdminPermissions = async () => {
      if (user) {
        console.log('Testing admin permissions for user:', user.id);
        const { data: hasRole, error } = await supabase
          .rpc('has_role', {
            _user_id: user.id,
            _role: 'admin'
          });
        console.log('Admin role check:', { hasRole, error });
      }
    };
    
    testAdminPermissions();
    
    // Test storage bucket access
    const testStorageAccess = async () => {
      try {
        console.log('Testing storage bucket access...');
        const { data, error } = await supabase.storage
          .from('deposit-proofs')
          .list('', { limit: 1 });
        
        console.log('Storage bucket test:', { data, error });
      } catch (error) {
        console.error('Storage bucket test error:', error);
      }
    };
    
    testStorageAccess();
  }, [user]);

  useEffect(() => {
    filterDeposits();
  }, [deposits, searchTerm, statusFilter]);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      console.log('Fetching deposits...');

      const { data: depositsData, error } = await supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching deposits data:', error);
        throw error;
      }

      console.log('Raw deposits data:', depositsData);

      // Fetch user profiles separately to avoid relationship issues
      const depositsWithUsers = await Promise.all(
        depositsData.map(async (deposit) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', deposit.user_id)
            .single();

          return {
            ...deposit,
            user: profile || { email: 'Unknown', full_name: 'Unknown User' }
          };
        })
      );

      console.log('Deposits with users:', depositsWithUsers);
      setDeposits(depositsWithUsers);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast({
        title: "Error",
        description: "Failed to load deposits",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDeposits = () => {
    let filtered = deposits;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(deposit =>
        deposit.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deposit.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deposit.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(deposit => deposit.status === statusFilter);
    }

    setFilteredDeposits(filtered);
  };

  const handleApproveDeposit = async (depositId: string) => {
    if (!user) return;

    // Prevent duplicate approvals
    if (processing) {
      console.log('Already processing, ignoring duplicate request');
      return;
    }

    // Check if deposit is already approved
    const deposit = deposits.find(d => d.id === depositId);
    if (!deposit) {
      toast({
        title: "Error",
        description: "Deposit not found",
        variant: "destructive"
      });
      return;
    }

    if (deposit.status === 'approved') {
      toast({
        title: "Already Approved",
        description: "This deposit has already been approved",
        variant: "destructive"
      });
      return;
    }

    if (deposit.status === 'rejected') {
      toast({
        title: "Cannot Approve",
        description: "This deposit has been rejected and cannot be approved",
        variant: "destructive"
      });
      return;
    }

    try {
      setProcessing(true);
      console.log('Starting deposit approval for:', depositId);

      // Update deposit status
      console.log('Updating deposit status...');
      console.log('Deposit ID:', depositId);
      console.log('Admin user ID:', user.id);
      
      const { data: updateData, error: depositError } = await supabase
        .from('deposits')
        .update({
          status: 'approved',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          notes: approvalReason
        })
        .eq('id', depositId)
        .select();

      if (depositError) {
        console.error('Deposit status update error:', depositError);
        throw depositError;
      }
      
      console.log('Deposit status update response:', updateData);
      console.log('Deposit status updated successfully');

      // Get deposit details for balance update
      const deposit = deposits.find(d => d.id === depositId);
      if (!deposit) throw new Error('Deposit not found');
      console.log('Deposit details:', deposit);

      // Update user balance
      console.log('Updating user balance...');
      console.log('User ID:', deposit.user_id);
      console.log('Amount:', deposit.amount);
      const { data: balanceData, error: balanceError } = await supabase
        .rpc('increment_balance', {
          user_id_param: deposit.user_id,
          amount_param: deposit.amount
        });

      if (balanceError) {
        console.error('Balance update error:', balanceError);
        throw balanceError;
      }
      console.log('Balance updated successfully. New balance:', balanceData);

      // First, find the existing transaction record
      console.log('Finding existing transaction record...');
      const { data: existingTransaction, error: findError } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference_id', depositId)
        .eq('type', 'deposit')
        .eq('user_id', deposit.user_id)
        .single();

      if (findError) {
        console.error('Error finding existing transaction:', findError);
        // If no existing transaction found, create a new one
        console.log('No existing transaction found, creating new one...');
        const { error: createError } = await supabase
          .from('transactions')
          .insert({
            user_id: deposit.user_id,
            amount: deposit.amount,
            type: 'deposit',
            status: 'completed',
            description: `Deposit approved: ${approvalReason || 'No reason provided'}`,
            reference_id: depositId
          });
        
        if (createError) {
          console.error('Transaction creation error:', createError);
          throw createError;
        }
        console.log('New transaction record created successfully');
      } else {
        // Update existing transaction record
        console.log('Updating existing transaction record:', existingTransaction);
        const { error: transactionError } = await supabase
          .from('transactions')
          .update({
            status: 'completed',
            description: `Deposit approved: ${approvalReason || 'No reason provided'}`
          })
          .eq('id', existingTransaction.id);
        
        if (transactionError) {
          console.error('Transaction update error:', transactionError);
          throw transactionError;
        }
        console.log('Transaction record updated successfully');
      }



      // Handle referral commission if applicable
      console.log('Handling referral commission...');
      await handleReferralCommission(deposit);

      toast({
        title: "Deposit Approved",
        description: `Deposit of ${formatCurrency(deposit.amount)} has been approved`,
      });

      setApprovalDialogOpen(false);
      setApprovalReason('');
      fetchDeposits(); // Refresh data
      
      // Trigger dashboard refresh for user
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (error) {
      console.error('Error approving deposit:', error);
      toast({
        title: "Error",
        description: `Failed to approve deposit: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectDeposit = async (depositId: string) => {
    if (!user) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from('deposits')
        .update({
          status: 'rejected',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          notes: rejectionReason
        })
        .eq('id', depositId);

      if (error) throw error;

      toast({
        title: "Deposit Rejected",
        description: "Deposit has been rejected",
      });

      setRejectionDialogOpen(false);
      setRejectionReason('');
      fetchDeposits(); // Refresh data
      
      // Trigger dashboard refresh for user
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      toast({
        title: "Error",
        description: "Failed to reject deposit",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReferralCommission = async (deposit: Deposit) => {
    try {
      // Get user's referral info
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('user_id', deposit.user_id)
        .single();

      if (profile?.referred_by) {
        const commissionAmount = deposit.amount * 0.02; // 2% commission

        // Update referrer's balance
        const { error: balanceError } = await supabase
          .rpc('increment_balance', {
            user_id_param: profile.referred_by,
            amount_param: commissionAmount
          });

        if (balanceError) throw balanceError;

        // Create referral transaction
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: profile.referred_by,
            amount: commissionAmount,
            type: 'referral_bonus',
            status: 'completed',
            description: `Referral commission from ${deposit.user?.email}`,
            reference_id: deposit.id
          });

        if (transactionError) throw transactionError;

        // Update referral record
        const { error: referralError } = await supabase
          .from('referrals')
          .upsert({
            referrer_id: profile.referred_by,
            referred_id: deposit.user_id,
            total_earned: commissionAmount,
            commission_rate: 0.02
          });

        if (referralError) throw referralError;
      }
    } catch (error) {
      console.error('Error handling referral commission:', error);
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

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const getPendingDepositsCount = () => {
    return deposits.filter(d => d.status === 'pending').length;
  };

  const getProofUrl = async (proofFileUrl: string | null) => {
    if (!proofFileUrl) return null;
    
    // If it's already a full URL, return it as is
    if (proofFileUrl.startsWith('http')) {
      return proofFileUrl;
    }
    
    try {
      // Try to get the file directly first
      const { data: fileData, error: fileError } = await supabase.storage
        .from('deposit-proofs')
        .download(proofFileUrl);
      
      if (fileError) {
        console.error('Error downloading file:', fileError);
        
        // If download fails, try to get public URL
        const { data, error } = supabase.storage
          .from('deposit-proofs')
          .getPublicUrl(proofFileUrl);
        
        if (error) {
          console.error('Error getting public URL:', error);
          return null;
        }
        
        return data.publicUrl;
      }
      
      // If download succeeds, create a blob URL
      const blob = new Blob([fileData], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error in getProofUrl:', error);
      return null;
    }
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
          <h1 className="text-3xl font-bold text-white">Deposit Management</h1>
          <p className="text-gray-400 mt-2">Review and approve pending deposits</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{getPendingDepositsCount()} pending</Badge>
          <Button 
            onClick={fetchDeposits} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
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
                  placeholder="Search by user email, name, or deposit ID..."
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
                <SelectItem value="all">All Deposits</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Deposits Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Deposits</CardTitle>
          <CardDescription className="text-gray-400">
            Review and manage deposit requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">User</TableHead>
                <TableHead className="text-gray-300">Amount</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Proof</TableHead>
                <TableHead className="text-gray-300">Date</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeposits.map((deposit) => (
                <TableRow key={deposit.id} className="border-gray-700">
                  <TableCell>
                    <div>
                      <div className="font-medium text-white">{deposit.user?.full_name}</div>
                      <div className="text-sm text-gray-400">{deposit.user?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-white">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                      {formatCurrency(deposit.amount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(deposit.status)}
                  </TableCell>
                  <TableCell>
                    {deposit.proof_file_url ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          console.log('Original proof_file_url:', deposit.proof_file_url);
                          const proofUrl = await getProofUrl(deposit.proof_file_url);
                          console.log('Generated proof URL:', proofUrl);
                          if (proofUrl) {
                            window.open(proofUrl, '_blank');
                          } else {
                            toast({
                              title: "Error",
                              description: "Could not load proof file",
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    ) : (
                      <span className="text-gray-500 text-sm">No proof</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {formatDate(deposit.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {deposit.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedDeposit(deposit);
                              setApprovalDialogOpen(true);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedDeposit(deposit);
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
                            <DialogTitle className="text-white">Deposit Details</DialogTitle>
                            <DialogDescription className="text-gray-400">
                              View detailed deposit information
                            </DialogDescription>
                          </DialogHeader>
                          {deposit && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-300">User</label>
                                  <p className="text-white">{deposit.user?.full_name}</p>
                                  <p className="text-gray-400 text-sm">{deposit.user?.email}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Amount</label>
                                  <p className="text-white">{formatCurrency(deposit.amount)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Status</label>
                                  <div className="mt-1">{getStatusBadge(deposit.status)}</div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Date</label>
                                  <p className="text-white">{formatDate(deposit.created_at)}</p>
                                </div>
                              </div>
                              {deposit.notes && (
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Notes</label>
                                  <p className="text-white mt-1">{deposit.notes}</p>
                                </div>
                              )}
                              {deposit.proof_file_url && (
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Proof of Payment</label>
                                  <Button
                                    variant="outline"
                                    className="mt-2"
                                    onClick={async () => {
                                      console.log('Dialog - Original proof_file_url:', deposit.proof_file_url);
                                      const proofUrl = await getProofUrl(deposit.proof_file_url);
                                      console.log('Dialog - Generated proof URL:', proofUrl);
                                      if (proofUrl) {
                                        window.open(proofUrl, '_blank');
                                      } else {
                                        toast({
                                          title: "Error",
                                          description: "Could not load proof file",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    View Proof
                                  </Button>
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

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Approve Deposit</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to approve this deposit?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDeposit && (
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Amount:</span>
                  <span className="text-white font-medium">{formatCurrency(selectedDeposit.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">User:</span>
                  <span className="text-white">{selectedDeposit.user?.email}</span>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-300">Approval Reason (Optional)</label>
              <Textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder="Enter approval reason..."
                className="mt-2 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setApprovalDialogOpen(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedDeposit && handleApproveDeposit(selectedDeposit.id)}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? 'Processing...' : 'Approve Deposit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Deposit</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to reject this deposit?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDeposit && (
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Amount:</span>
                  <span className="text-white font-medium">{formatCurrency(selectedDeposit.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">User:</span>
                  <span className="text-white">{selectedDeposit.user?.email}</span>
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
                onClick={() => selectedDeposit && handleRejectDeposit(selectedDeposit.id)}
                disabled={processing || !rejectionReason.trim()}
                variant="destructive"
              >
                {processing ? 'Processing...' : 'Reject Deposit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDeposits; 