import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  AlertCircle,
  Clock,
  Check,
  X
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface KYCSubmission {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  date_of_birth: string;
  kyc_status: 'pending' | 'verified' | 'rejected';
  kyc_id_url: string;
  kyc_selfie_url: string;
  kyc_submitted_at: string;
  kyc_rejection_reason?: string;
  kyc_verified_at?: string;
  kyc_verified_by?: string;
}

const KYCManagement = () => {
  const { user: currentUser } = useAuth();
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchKYCSubmissions();
  }, []);

  const fetchKYCSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          email,
          date_of_birth,
          kyc_status,
          kyc_id_url,
          kyc_selfie_url,
          kyc_submitted_at,
          kyc_rejection_reason,
          kyc_verified_at,
          kyc_verified_by
        `)
        .not('kyc_status', 'eq', 'not_submitted')
        .order('kyc_submitted_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        id: item.user_id,
        user_id: item.user_id,
        email: item.email || 'Unknown',
        full_name: item.full_name || 'Unknown',
        date_of_birth: item.date_of_birth || '',
        kyc_status: item.kyc_status,
        kyc_id_url: item.kyc_id_url,
        kyc_selfie_url: item.kyc_selfie_url,
        kyc_submitted_at: item.kyc_submitted_at,
        kyc_rejection_reason: item.kyc_rejection_reason,
        kyc_verified_at: item.kyc_verified_at,
        kyc_verified_by: item.kyc_verified_by
      })) || [];

      setSubmissions(formattedData);
    } catch (error) {
      console.error('Error fetching KYC submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch KYC submissions.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      verified: "default",
      pending: "secondary",
      rejected: "destructive"
    };

    const labels: Record<string, string> = {
      verified: "Verified",
      pending: "Pending",
      rejected: "Rejected"
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || "Unknown"}
      </Badge>
    );
  };

  const handleVerifyKYC = async (submission: KYCSubmission) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Admin user not found.",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'verified',
          kyc_verified: true,
          kyc_verified_at: new Date().toISOString(),
          kyc_verified_by: currentUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', submission.user_id);

      if (error) throw error;

      // Log admin action
      const { error: logError } = await supabase
        .from('admin_actions')
        .insert({
          admin_id: currentUser.id,
          action_type: 'kyc_verified',
          entity_type: 'user',
          entity_id: submission.user_id,
          details: { message: `KYC verified for ${submission.full_name}` },
          created_at: new Date().toISOString()
        });

      if (logError) {
        console.error('Error logging admin action:', logError);
        // Don't throw here as the main verification was successful
      }

      toast({
        title: "KYC Verified",
        description: `${submission.full_name}'s KYC has been verified.`
      });

      fetchKYCSubmissions();
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify KYC.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectKYC = async (submission: KYCSubmission) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Admin user not found.",
        variant: "destructive"
      });
      return;
    }

    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'rejected',
          kyc_verified: false,
          kyc_rejection_reason: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', submission.user_id);

      if (error) throw error;

      // Log admin action
      const { error: logError } = await supabase
        .from('admin_actions')
        .insert({
          admin_id: currentUser.id,
          action_type: 'kyc_rejected',
          entity_type: 'user',
          entity_id: submission.user_id,
          details: { message: `KYC rejected for ${submission.full_name}: ${rejectionReason}` },
          created_at: new Date().toISOString()
        });

      if (logError) {
        console.error('Error logging admin action:', logError);
        // Don't throw here as the main rejection was successful
      }

      toast({
        title: "KYC Rejected",
        description: `${submission.full_name}'s KYC has been rejected.`
      });

      setRejectionReason('');
      setShowRejectionDialog(false);
      fetchKYCSubmissions();
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject KYC.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesStatus = filterStatus === 'all' || submission.kyc_status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      submission.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
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

  const getDocumentUrl = (filePath: string) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/kyc-documents/${filePath}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">KYC Management</h1>
          <p className="text-muted-foreground">Review and verify user identity documents</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {submissions.filter(s => s.kyc_status === 'pending').length} Pending
          </Badge>
          <Badge variant="default">
            {submissions.filter(s => s.kyc_status === 'verified').length} Verified
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setFilterStatus('all');
                setSearchTerm('');
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>KYC Submissions ({filteredSubmissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No KYC submissions found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'No KYC submissions have been made yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{submission.full_name}</p>
                      <p className="text-sm text-muted-foreground">{submission.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {formatDate(submission.kyc_submitted_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {getStatusBadge(submission.kyc_status)}
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSubmission(submission)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Review KYC Submission</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                          {/* User Info */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Full Name</Label>
                              <p className="text-sm font-medium">{submission.full_name}</p>
                            </div>
                            <div>
                              <Label>Date of Birth</Label>
                              <p className="text-sm font-medium">{submission.date_of_birth}</p>
                            </div>
                            <div>
                              <Label>Email</Label>
                              <p className="text-sm font-medium">{submission.email}</p>
                            </div>
                            <div>
                              <Label>Submitted</Label>
                              <p className="text-sm font-medium">{formatDate(submission.kyc_submitted_at)}</p>
                            </div>
                          </div>

                          {/* Documents */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Government ID</Label>
                              <div className="mt-2 p-2 border rounded bg-muted/50">
                                <img 
                                  src={getDocumentUrl(submission.kyc_id_url)}
                                  alt="Government ID"
                                  className="max-w-full h-auto rounded"
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Selfie</Label>
                              <div className="mt-2 p-2 border rounded bg-muted/50">
                                <img 
                                  src={getDocumentUrl(submission.kyc_selfie_url)}
                                  alt="Selfie"
                                  className="max-w-full h-auto rounded"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          {submission.kyc_status === 'pending' && (
                            <div className="flex items-center space-x-4">
                              <Button
                                onClick={() => handleVerifyKYC(submission)}
                                disabled={processing}
                                className="flex items-center gap-2"
                              >
                                <Check className="h-4 w-4" />
                                Verify KYC
                              </Button>
                              
                              <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    disabled={processing}
                                    className="flex items-center gap-2"
                                  >
                                    <X className="h-4 w-4" />
                                    Reject KYC
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Reject KYC Submission</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                                      <Input
                                        id="rejectionReason"
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Enter reason for rejection..."
                                      />
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => setShowRejectionDialog(false)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleRejectKYC(submission)}
                                        disabled={processing}
                                      >
                                        Reject KYC
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}

                          {submission.kyc_status === 'rejected' && submission.kyc_rejection_reason && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                <strong>Rejection Reason:</strong> {submission.kyc_rejection_reason}
                              </AlertDescription>
                            </Alert>
                          )}

                          {submission.kyc_status === 'verified' && (
                            <Alert>
                              <CheckCircle className="h-4 w-4" />
                              <AlertDescription>
                                KYC verified on {submission.kyc_verified_at ? formatDate(submission.kyc_verified_at) : 'Unknown date'}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KYCManagement; 