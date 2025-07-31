import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Activity,
  Search,
  Filter,
  Eye,
  Clock,
  User,
  DollarSign,
  Shield,
  CreditCard,
  Wallet,
  TrendingUp,
  Users2,
  Calendar,
  Download
} from 'lucide-react';

interface AdminLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_user_id: string | null;
  amount: number | null;
  description: string;
  created_at: string;
  admin?: {
    email: string;
    full_name: string;
  };
  target_user?: {
    email: string;
    full_name: string;
  };
}

const AdminLogs = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, actionFilter, dateFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      // Since we don't have a dedicated admin_logs table, we'll simulate it
      // by combining data from various tables that track admin actions
      const logs: AdminLog[] = [];

      // Fetch deposits with admin verification
      const { data: deposits } = await supabase
        .from('deposits')
        .select('id, verified_by, verified_at, amount, user_id, status, notes')
        .not('verified_by', 'is', null);

      deposits?.forEach(deposit => {
        logs.push({
          id: `deposit_${deposit.id}`,
          admin_id: deposit.verified_by!,
          action_type: 'deposit_approval',
          target_user_id: deposit.user_id,
          amount: deposit.amount,
          description: `Deposit ${deposit.status}: ${deposit.notes || 'No notes'}`,
          created_at: deposit.verified_at!,
          target_user: { email: 'Unknown', full_name: 'Unknown User' }
        });
      });

      // Fetch withdrawals with admin processing
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('id, processed_by, processed_at, amount, user_id, status, notes')
        .not('processed_by', 'is', null);

      withdrawals?.forEach(withdrawal => {
        logs.push({
          id: `withdrawal_${withdrawal.id}`,
          admin_id: withdrawal.processed_by!,
          action_type: 'withdrawal_processing',
          target_user_id: withdrawal.user_id,
          amount: withdrawal.amount,
          description: `Withdrawal ${withdrawal.status}: ${withdrawal.notes || 'No notes'}`,
          created_at: withdrawal.processed_at!,
          target_user: { email: 'Unknown', full_name: 'Unknown User' }
        });
      });

      // Fetch KYC verifications
      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          user_id,
          updated_at,
          kyc_verified
        `)
        .not('kyc_verified', 'is', null);

      profiles?.forEach(profile => {
        if (profile.updated_at) {
          logs.push({
            id: `kyc_${profile.user_id}`,
            admin_id: 'admin', // We don't track which admin did this
            action_type: 'kyc_verification',
            target_user_id: profile.user_id,
            amount: null,
            description: `KYC ${profile.kyc_verified ? 'verified' : 'rejected'}`,
            created_at: profile.updated_at,
            target_user: { email: 'user@example.com', full_name: 'User' } // Placeholder
          });
        }
      });

      // Sort by date (newest first)
      logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setLogs(logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Error",
        description: "Failed to load activity logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target_user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target_user?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action_type === actionFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(log => {
        const logDate = new Date(log.created_at);
        switch (dateFilter) {
          case 'today':
            return logDate >= today;
          case 'yesterday':
            return logDate >= yesterday && logDate < today;
          case 'week':
            return logDate >= lastWeek;
          case 'month':
            return logDate >= lastMonth;
          default:
            return true;
        }
      });
    }

    setFilteredLogs(filtered);
  };

  const exportLogs = () => {
    const csvContent = [
      ['Date', 'Action', 'Admin', 'Target User', 'Amount', 'Description'],
      ...filteredLogs.map(log => [
        formatDate(log.created_at),
        getActionTypeLabel(log.action_type),
        log.admin?.email || 'System',
        log.target_user?.email || '',
        log.amount ? `$${log.amount.toFixed(2)}` : '',
        log.description
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'admin_logs.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Activity logs exported to CSV",
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

  const getActionTypeLabel = (actionType: string) => {
    const labels = {
      deposit_approval: 'Deposit Approval',
      withdrawal_processing: 'Withdrawal Processing',
      kyc_verification: 'KYC Verification',
      profit_distribution: 'Profit Distribution',
      user_management: 'User Management'
    };
    return labels[actionType as keyof typeof labels] || actionType;
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'deposit_approval':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'withdrawal_processing':
        return <Wallet className="h-4 w-4 text-blue-500" />;
      case 'kyc_verification':
        return <Shield className="h-4 w-4 text-purple-500" />;
      case 'profit_distribution':
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case 'user_management':
        return <Users2 className="h-4 w-4 text-indigo-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionBadge = (actionType: string) => {
    const variants = {
      deposit_approval: 'default',
      withdrawal_processing: 'secondary',
      kyc_verification: 'outline',
      profit_distribution: 'default',
      user_management: 'secondary'
    } as const;

    return (
      <Badge variant={variants[actionType as keyof typeof variants] || 'secondary'}>
        {getActionTypeLabel(actionType)}
      </Badge>
    );
  };

  const getLogStats = () => {
    const totalLogs = logs.length;
    const todayLogs = logs.filter(log => {
      const logDate = new Date(log.created_at);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length;

    const depositLogs = logs.filter(log => log.action_type === 'deposit_approval').length;
    const withdrawalLogs = logs.filter(log => log.action_type === 'withdrawal_processing').length;
    const kycLogs = logs.filter(log => log.action_type === 'kyc_verification').length;

    return {
      totalLogs,
      todayLogs,
      depositLogs,
      withdrawalLogs,
      kycLogs
    };
  };

  const stats = getLogStats();

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
          <h1 className="text-3xl font-bold text-white">Activity Log</h1>
          <p className="text-gray-400 mt-2">Track all admin actions and system events</p>
        </div>
        <Button onClick={exportLogs} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Actions</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalLogs}</div>
            <div className="text-xs text-gray-400 mt-1">All time actions</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Today</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.todayLogs}</div>
            <div className="text-xs text-gray-400 mt-1">Actions today</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Deposits</CardTitle>
            <CreditCard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.depositLogs}</div>
            <div className="text-xs text-gray-400 mt-1">Approved deposits</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Withdrawals</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.withdrawalLogs}</div>
            <div className="text-xs text-gray-400 mt-1">Processed withdrawals</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">KYC Reviews</CardTitle>
            <Shield className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.kycLogs}</div>
            <div className="text-xs text-gray-400 mt-1">KYC verifications</div>
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
                  placeholder="Search by description, user email, or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="deposit_approval">Deposit Approvals</SelectItem>
                <SelectItem value="withdrawal_processing">Withdrawal Processing</SelectItem>
                <SelectItem value="kyc_verification">KYC Verifications</SelectItem>
                <SelectItem value="profit_distribution">Profit Distributions</SelectItem>
                <SelectItem value="user_management">User Management</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Activity Logs</CardTitle>
          <CardDescription className="text-gray-400">
            Detailed log of all admin actions and system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Action</TableHead>
                <TableHead className="text-gray-300">Target User</TableHead>
                <TableHead className="text-gray-300">Amount</TableHead>
                <TableHead className="text-gray-300">Description</TableHead>
                <TableHead className="text-gray-300">Date</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-gray-700">
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getActionIcon(log.action_type)}
                      {getActionBadge(log.action_type)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.target_user ? (
                      <div>
                        <div className="font-medium text-white">{log.target_user.full_name}</div>
                        <div className="text-sm text-gray-400">{log.target_user.email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-500">System</span>
                    )}
                  </TableCell>
                  <TableCell className="text-white">
                    {log.amount ? (
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                        {formatCurrency(log.amount)}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-gray-300 max-w-xs truncate">
                    {log.description}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-800 border-gray-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">Log Details</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            View detailed log information
                          </DialogDescription>
                        </DialogHeader>
                        {selectedLog && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-300">Action Type</label>
                                <div className="mt-1">{getActionBadge(selectedLog.action_type)}</div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-300">Date & Time</label>
                                <p className="text-white">{formatDate(selectedLog.created_at)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-300">Target User</label>
                                <p className="text-white">{selectedLog.target_user?.full_name || 'System'}</p>
                                <p className="text-gray-400 text-sm">{selectedLog.target_user?.email || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-300">Amount</label>
                                <p className="text-white">
                                  {selectedLog.amount ? formatCurrency(selectedLog.amount) : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-300">Description</label>
                              <p className="text-white mt-1">{selectedLog.description}</p>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogs; 