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
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  AlertCircle,
  User,
  Calendar,
  FileText,
  Image,
  Download
} from 'lucide-react';

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  kyc_verified: boolean | null;
  created_at: string;
  kyc_documents?: KYCDocument[];
}

interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
  verified: boolean | null;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
}

const AdminKYC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [kycDialogOpen, setKycDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch KYC documents for each user
      const usersWithKYC = await Promise.all(
        profiles.map(async (profile) => {
          const { data: kycDocuments } = await supabase
            .from('kyc_documents')
            .select('*')
            .eq('user_id', profile.user_id);

          return {
            ...profile,
            kyc_documents: kycDocuments || []
          };
        })
      );

      setUsers(usersWithKYC);
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

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        switch (statusFilter) {
          case 'pending':
            return user.kyc_verified === null;
          case 'verified':
            return user.kyc_verified === true;
          case 'rejected':
            return user.kyc_verified === false;
          default:
            return true;
        }
      });
    }

    setFilteredUsers(filtered);
  };

  const handleVerifyKYC = async (userId: string) => {
    if (!user) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Update KYC documents status
      const { error: documentsError } = await supabase
        .from('kyc_documents')
        .update({
          verified: true,
          verified_by: user.id,
          verified_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (documentsError) throw documentsError;

      toast({
        title: "KYC Verified",
        description: "User KYC has been verified successfully",
      });

      setKycDialogOpen(false);
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error('Error verifying KYC:', error);
      toast({
        title: "Error",
        description: "Failed to verify KYC",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectKYC = async (userId: string) => {
    if (!user) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_verified: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Update KYC documents status
      const { error: documentsError } = await supabase
        .from('kyc_documents')
        .update({
          verified: false,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('user_id', userId);

      if (documentsError) throw documentsError;

      toast({
        title: "KYC Rejected",
        description: "User KYC has been rejected",
      });

      setRejectionDialogOpen(false);
      setRejectionReason('');
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      toast({
        title: "Error",
        description: "Failed to reject KYC",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
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

  const getKYCStatusBadge = (status: boolean | null) => {
    if (status === null) {
      return <Badge variant="secondary">Pending</Badge>;
    }
    return status ? (
      <Badge variant="default" className="bg-green-600">Verified</Badge>
    ) : (
      <Badge variant="destructive">Rejected</Badge>
    );
  };

  const getPendingKYCCount = () => {
    return users.filter(u => u.kyc_verified === null).length;
  };

  const getVerifiedKYCCount = () => {
    return users.filter(u => u.kyc_verified === true).length;
  };

  const getRejectedKYCCount = () => {
    return users.filter(u => u.kyc_verified === false).length;
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
          <h1 className="text-3xl font-bold text-white">KYC Verification</h1>
          <p className="text-gray-400 mt-2">Review and verify user identity documents</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{getPendingKYCCount()} pending</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{getPendingKYCCount()}</div>
            <div className="text-xs text-gray-400 mt-1">Awaiting verification</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{getVerifiedKYCCount()}</div>
            <div className="text-xs text-gray-400 mt-1">Successfully verified</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{getRejectedKYCCount()}</div>
            <div className="text-xs text-gray-400 mt-1">Failed verification</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by user email or name..."
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
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">KYC Applications</CardTitle>
          <CardDescription className="text-gray-400">
            Review user identity verification documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">User</TableHead>
                <TableHead className="text-gray-300">KYC Status</TableHead>
                <TableHead className="text-gray-300">Documents</TableHead>
                <TableHead className="text-gray-300">Joined</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-gray-700">
                  <TableCell>
                    <div>
                      <div className="font-medium text-white">{user.full_name}</div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getKYCStatusBadge(user.kyc_verified)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-white">{user.kyc_documents?.length || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {user.kyc_verified === null && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setKycDialogOpen(true);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedUser(user);
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
                        <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl">
                          <DialogHeader>
                            <DialogTitle className="text-white">KYC Review</DialogTitle>
                            <DialogDescription className="text-gray-400">
                              Review user identity documents
                            </DialogDescription>
                          </DialogHeader>
                          {user && (
                            <div className="space-y-6">
                              {/* User Info */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Name</label>
                                  <p className="text-white">{user.full_name}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Email</label>
                                  <p className="text-white">{user.email}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">KYC Status</label>
                                  <div className="mt-1">{getKYCStatusBadge(user.kyc_verified)}</div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-300">Joined</label>
                                  <p className="text-white">{formatDate(user.created_at)}</p>
                                </div>
                              </div>

                              {/* KYC Documents */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-300 mb-3">Identity Documents</h4>
                                {user.kyc_documents && user.kyc_documents.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {user.kyc_documents.map((doc) => (
                                      <div key={doc.id} className="border border-gray-600 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-white capitalize">
                                            {doc.document_type.replace('_', ' ')}
                                          </span>
                                          <Badge variant={doc.verified ? 'default' : 'secondary'}>
                                            {doc.verified ? 'Verified' : 'Pending'}
                                          </Badge>
                                        </div>
                                        <div className="aspect-video bg-gray-700 rounded-lg mb-2 flex items-center justify-center">
                                          <Image className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full"
                                          onClick={() => window.open(doc.file_url, '_blank')}
                                        >
                                          <Download className="h-4 w-4 mr-2" />
                                          View Document
                                        </Button>
                                        <p className="text-xs text-gray-400 mt-1">
                                          Uploaded: {formatDate(doc.uploaded_at)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-gray-400">
                                    <FileText className="h-12 w-12 mx-auto mb-2" />
                                    <p>No documents uploaded</p>
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              {user.kyc_verified === null && (
                                <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
                                  <Button
                                    variant="outline"
                                    onClick={() => setKycDialogOpen(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => handleVerifyKYC(user.user_id)}
                                    disabled={processing}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {processing ? 'Processing...' : 'Verify KYC'}
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setKycDialogOpen(false);
                                      setRejectionDialogOpen(true);
                                    }}
                                    disabled={processing}
                                    variant="destructive"
                                  >
                                    Reject
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

      {/* Verification Dialog */}
      <Dialog open={kycDialogOpen} onOpenChange={setKycDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Verify KYC</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to verify this user's KYC?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">User:</span>
                  <span className="text-white">{selectedUser.full_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Email:</span>
                  <span className="text-white">{selectedUser.email}</span>
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setKycDialogOpen(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedUser && handleVerifyKYC(selectedUser.user_id)}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? 'Processing...' : 'Verify KYC'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject KYC</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to reject this user's KYC?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">User:</span>
                  <span className="text-white">{selectedUser.full_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Email:</span>
                  <span className="text-white">{selectedUser.email}</span>
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
                onClick={() => selectedUser && handleRejectKYC(selectedUser.user_id)}
                disabled={processing || !rejectionReason.trim()}
                variant="destructive"
              >
                {processing ? 'Processing...' : 'Reject KYC'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKYC; 