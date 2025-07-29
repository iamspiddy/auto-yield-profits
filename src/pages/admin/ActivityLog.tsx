import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Calendar, Loader2 } from 'lucide-react';
import { getBadgeVariant } from '@/lib/badgeUtils';
import { supabase } from '@/integrations/supabase/client';

interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  details: any;
  amount?: number;
  reason?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const ActivityLog = () => {
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');

  const fetchActions = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_actions')
        .select(`
          *,
          profiles!admin_id(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActions((data || []) as AdminAction[]);
    } catch (error) {
      console.error('Error fetching actions:', error);
      setActions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const filteredActions = actions.filter(action => {
    const adminName = action.profiles?.full_name || 'Unknown Admin';
    const details = action.reason || JSON.stringify(action.details);
    
    const matchesSearch = adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.entity_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'all' || action.action_type === filterAction;
    const matchesEntity = filterEntity === 'all' || action.entity_type === filterEntity;
    
    return matchesSearch && matchesAction && matchesEntity;
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Activity Log</h1>
          <p className="text-muted-foreground">
            Track all administrative actions and changes
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Admin Activities</CardTitle>
                <CardDescription>Recent administrative actions</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search activities..."
                    className="pl-8 w-full md:w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="approve">Approve</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="manual_deposit">Manual Deposit</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterEntity} onValueChange={setFilterEntity}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="balance">Balance</SelectItem>
                    <SelectItem value="transaction">Transaction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading activities...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredActions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No admin activities found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell>{action.profiles?.full_name || 'Unknown Admin'}</TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(action.action_type)}>
                          {action.action_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{action.entity_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{action.entity_id}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate">
                          {action.reason || JSON.stringify(action.details)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {action.amount && (
                          <span className="font-medium text-green-600">
                            {formatCurrency(action.amount)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(action.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ActivityLog;