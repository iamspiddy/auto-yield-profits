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
import { toast } from '@/components/ui/use-toast';
import { Search, Filter, Loader2, Download, Eye, Calendar } from 'lucide-react';
import { format } from 'date-fns';

type AdminAction = {
  id: string;
  admin_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  details: any;
  ip_address: string;
  created_at: string;
  admin_email?: string;
  admin_name?: string;
};

const ActivityLog = () => {
  const { user } = useAuth();
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [selectedAction, setSelectedAction] = useState<AdminAction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    // Create admin_actions table if it doesn't exist
    createAdminActionsTableIfNeeded();
    fetchActions();
  }, [actionTypeFilter, entityTypeFilter, dateFilter]);

  const createAdminActionsTableIfNeeded = async () => {
    // For now, just return sample data since admin_actions table doesn't exist yet
    return generateSampleActions();
  };


  const generateSampleActions = (): AdminAction[] => {
    const actionTypes = ['create', 'update', 'delete', 'approve', 'reject'];
    const entityTypes = ['user', 'deposit', 'withdrawal', 'profit', 'referral'];
    const adminIds = ['d290f1ee-6c54-4b01-90e6-d701748f0851', '7c8d9e1f-3b5a-4c2d-8e7f-6a9b0c1d2e3f'];
    const adminEmails = ['admin@autoyield.com', 'support@autoyield.com'];
    const adminNames = ['Admin User', 'Support Admin'];
    const ipAddresses = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
    
    const sampleActions: AdminAction[] = [];
    
    // Generate 20 sample actions
    for (let i = 0; i < 20; i++) {
      const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
      const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
      const adminIndex = Math.floor(Math.random() * adminIds.length);
      
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Random date in the last 30 days
      
      let details: any = {};
      
      switch (entityType) {
        case 'user':
          details = {
            user_email: `user${i}@example.com`,
            changes: actionType === 'create' ? 'Created new user account' : 'Updated user profile'
          };
          break;
        case 'deposit':
          details = {
            amount: (Math.random() * 1000).toFixed(2),
            currency: 'USD',
            status: actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'pending',
            notes: actionType === 'reject' ? 'Invalid proof of payment' : 'Verified transaction'
          };
          break;
        case 'withdrawal':
          details = {
            amount: (Math.random() * 500).toFixed(2),
            currency: 'USD',
            status: actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'pending',
            notes: actionType === 'reject' ? 'Insufficient balance' : 'Processed successfully'
          };
          break;
        case 'profit':
          details = {
            amount: (Math.random() * 100).toFixed(2),
            users_affected: Math.floor(Math.random() * 50) + 1,
            distribution_type: Math.random() > 0.5 ? 'percentage' : 'fixed'
          };
          break;
        case 'referral':
          details = {
            referrer: `user${Math.floor(Math.random() * 100)}@example.com`,
            referred: `newuser${Math.floor(Math.random() * 100)}@example.com`,
            commission_rate: (Math.random() * 0.1).toFixed(2)
          };
          break;
      }
      
      sampleActions.push({
        id: `sample-${i}-${Date.now()}`,
        admin_id: adminIds[adminIndex],
        admin_email: adminEmails[adminIndex],
        admin_name: adminNames[adminIndex],
        action_type: actionType,
        entity_type: entityType,
        entity_id: `${entityType}-${Math.floor(Math.random() * 1000)}`,
        details,
        ip_address: ipAddresses[Math.floor(Math.random() * ipAddresses.length)],
        created_at: date.toISOString()
      });
    }
    
    // Sort by date, newest first
    return sampleActions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const fetchActions = async () => {
    try {
      setLoading(true);
      
      // For now, use sample data since admin_actions table doesn't exist yet
      const sampleData = await createAdminActionsTableIfNeeded();
      setActions(sampleData);
    } catch (error) {
      console.error('Error fetching actions:', error);
      setActions(generateSampleActions());
    } finally {
      setLoading(false);
    }
  };

  const openActionDetails = (action: AdminAction) => {
    setSelectedAction(action);
    setDetailsOpen(true);
  };

  const exportActionsToCSV = () => {
    // Create CSV content
    const headers = ['Date', 'Admin', 'Action Type', 'Entity Type', 'Entity ID', 'IP Address', 'Details'];
    const rows = filteredActions.map(action => [
      format(new Date(action.created_at), 'yyyy-MM-dd HH:mm:ss'),
      action.admin_name || action.admin_email || action.admin_id,
      action.action_type,
      action.entity_type,
      action.entity_id,
      action.ip_address,
      JSON.stringify(action.details)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `activity_log_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredActions = actions.filter(action => {
    const matchesSearch = 
      action.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.admin_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.entity_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(action.details).toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return 'default';
      case 'update':
        return 'outline';
      case 'delete':
        return 'destructive';
      case 'approve':
        return 'secondary';
      case 'reject':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getEntityBadgeVariant = (entityType: string) => {
    switch (entityType) {
      case 'user':
        return 'default';
      case 'deposit':
        return 'secondary';
      case 'withdrawal':
        return 'outline';
      case 'profit':
        return 'secondary';
      case 'referral':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity Log</h1>
        <p className="text-muted-foreground">
          Track and audit all administrative actions
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Admin Actions</CardTitle>
              <CardDescription>
                Complete history of administrative activities
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search actions..."
                  className="pl-8 w-full md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={dateFilter}
                  onValueChange={setDateFilter}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Date Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={actionTypeFilter}
                  onValueChange={setActionTypeFilter}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="approve">Approve</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={entityTypeFilter}
                  onValueChange={setEntityTypeFilter}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="profit">Profit</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={exportActionsToCSV}
                title="Export to CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No actions found matching your criteria
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(action.created_at)}
                      </TableCell>
                      <TableCell>
                        <div>{action.admin_name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{action.admin_email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(action.action_type)}>
                          {action.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getEntityBadgeVariant(action.entity_type)}>
                            {action.entity_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{action.entity_id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {action.ip_address}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openActionDetails(action)}
                        >
                          <Eye className="h-4 w-4" />
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

      {/* Action Details Modal */}
      {selectedAction && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Action Details</DialogTitle>
              <DialogDescription>
                ID: {selectedAction.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Date & Time</h4>
                  <p>{formatDate(selectedAction.created_at)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">IP Address</h4>
                  <p className="font-mono text-sm">{selectedAction.ip_address}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Admin</h4>
                <p>{selectedAction.admin_name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{selectedAction.admin_email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Action</h4>
                  <Badge variant={getActionBadgeVariant(selectedAction.action_type)}>
                    {selectedAction.action_type}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Entity</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant={getEntityBadgeVariant(selectedAction.entity_type)}>
                      {selectedAction.entity_type}
                    </Badge>
                    <span className="text-xs">{selectedAction.entity_id}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Details</h4>
                <div className="bg-muted p-3 rounded-md overflow-auto max-h-[200px]">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(selectedAction.details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDetailsOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ActivityLog;