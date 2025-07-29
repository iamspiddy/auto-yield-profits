import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Loader2, Users, Download, Edit, Save, X } from 'lucide-react';

type User = {
  id: string;
  email: string;
  full_name: string;
  kyc_verified: boolean;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
};

type Referral = {
  id: string;
  referrer_id: string;
  referred_id: string;
  commission_rate: number;
  total_earned: number;
  created_at: string;
  referrer_name?: string;
  referrer_email?: string;
  referred_name?: string;
  referred_email?: string;
};

type ReferralTreeNode = {
  user_id: string;
  name: string;
  email: string;
  level: number;
  referral_code: string;
  total_earned: number;
  children: ReferralTreeNode[];
};

const ReferralsManagement = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [commissionRate, setCommissionRate] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  
  // Tree visualization
  const [treeOpen, setTreeOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [referralTree, setReferralTree] = useState<ReferralTreeNode | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);

  useEffect(() => {
    fetchReferrals();
  }, [filter]);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('referrals')
        .select(`
          *,
          referrer:referrer_id(id, email, full_name),
          referred:referred_id(id, email, full_name)
        `);
      
      // Apply filter if needed
      if (filter === 'active') {
        query = query.gt('total_earned', 0);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Format the data to include user information
      const formattedData = data?.map((item: any) => ({
        ...item,
        referrer_name: item.referrer?.full_name || 'Unknown',
        referrer_email: item.referrer?.email || 'Unknown',
        referred_name: item.referred?.full_name || 'Unknown',
        referred_email: item.referred?.email || 'Unknown'
      })) || [];

      setReferrals(formattedData);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load referrals. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralTree = async (userId: string) => {
    try {
      setTreeLoading(true);
      
      // First get the user details
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (userError) throw userError;
      
      setSelectedUser(userData);
      
      // Then build the referral tree
      const tree = await buildReferralTree(userId);
      setReferralTree(tree);
    } catch (error) {
      console.error('Error fetching referral tree:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load referral tree. Please try again.',
      });
    } finally {
      setTreeLoading(false);
    }
  };

  const buildReferralTree = async (userId: string, level: number = 0): Promise<ReferralTreeNode | null> => {
    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) return null;
    
    // Get total earnings from referrals
    const { data: referralData, error: referralError } = await supabase
      .from('referrals')
      .select('total_earned')
      .eq('referrer_id', userId);
    
    const totalEarned = referralData?.reduce((sum, item) => sum + (item.total_earned || 0), 0) || 0;
    
    // Find all users referred by this user
    const { data: referredUsers, error: referredError } = await supabase
      .from('profiles')
      .select('*')
      .eq('referred_by', userId);
    
    if (referredError) return null;
    
    // Build children nodes recursively (but limit depth to prevent infinite recursion)
    const children: ReferralTreeNode[] = [];
    if (level < 3 && referredUsers) {
      for (const referredUser of referredUsers) {
        const childNode = await buildReferralTree(referredUser.id, level + 1);
        if (childNode) children.push(childNode);
      }
    }
    
    return {
      user_id: userData.id,
      name: userData.full_name,
      email: userData.email,
      level,
      referral_code: userData.referral_code,
      total_earned: totalEarned,
      children
    };
  };

  const openReferralDetails = (referral: Referral) => {
    setSelectedReferral(referral);
    setCommissionRate(referral.commission_rate.toString());
    setDetailsOpen(true);
    setEditMode(false);
  };

  const handleUpdateCommissionRate = async () => {
    if (!selectedReferral) return;
    
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      toast({
        variant: 'destructive',
        title: 'Invalid Rate',
        description: 'Please enter a valid commission rate between 0 and 1 (e.g., 0.05 for 5%).',
      });
      return;
    }
    
    try {
      setProcessingAction(true);
      
      const { error } = await supabase
        .from('referrals')
        .update({
          commission_rate: rate
        })
        .eq('id', selectedReferral.id);

      if (error) throw error;

      toast({
        title: 'Commission Rate Updated',
        description: `Successfully updated commission rate to ${(rate * 100).toFixed(2)}%.`,
      });

      // Update local state
      setSelectedReferral({
        ...selectedReferral,
        commission_rate: rate
      });
      setEditMode(false);
      fetchReferrals(); // Refresh the list
    } catch (error) {
      console.error('Error updating commission rate:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update commission rate. Please try again.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const exportReferralsToCSV = () => {
    // Create CSV content
    const headers = ['Referrer', 'Referrer Email', 'Referred User', 'Referred Email', 'Commission Rate', 'Total Earned', 'Date Created'];
    const rows = filteredReferrals.map(ref => [
      ref.referrer_name,
      ref.referrer_email,
      ref.referred_name,
      ref.referred_email,
      (ref.commission_rate * 100).toFixed(2) + '%',
      ref.total_earned.toFixed(2),
      new Date(ref.created_at).toLocaleDateString()
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
    link.setAttribute('download', `referrals_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredReferrals = referrals.filter(referral => {
    const matchesSearch = 
      referral.referrer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referrer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referred_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referred_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  const renderReferralTreeNode = (node: ReferralTreeNode) => {
    return (
      <div className="ml-6 mt-2" key={node.user_id}>
        <div className="flex items-start border-l-2 border-gray-200 pl-4 py-2">
          <div className="flex-1">
            <div className="font-medium">{node.name}</div>
            <div className="text-xs text-muted-foreground">{node.email}</div>
            <div className="text-xs mt-1">
              <span className="text-muted-foreground">Code: </span>
              <span className="font-mono">{node.referral_code}</span>
            </div>
            {node.total_earned > 0 && (
              <div className="text-xs mt-1">
                <span className="text-muted-foreground">Earned: </span>
                <span className="font-medium">{formatCurrency(node.total_earned)}</span>
              </div>
            )}
          </div>
        </div>
        {node.children.length > 0 && (
          <div className="ml-4">
            {node.children.map(child => renderReferralTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referral Management</h1>
        <p className="text-muted-foreground">
          Track and manage user referrals and commissions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Referrals</CardTitle>
                <CardDescription>
                  All user referral relationships
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search referrals..."
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
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Referrals</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={exportReferralsToCSV}
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
            ) : filteredReferrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No referrals found matching your criteria
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Referred User</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Earned</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReferrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell className="font-medium">
                          <div>{referral.referrer_name}</div>
                          <div className="text-xs text-muted-foreground">{referral.referrer_email}</div>
                        </TableCell>
                        <TableCell>
                          <div>{referral.referred_name}</div>
                          <div className="text-xs text-muted-foreground">{referral.referred_email}</div>
                        </TableCell>
                        <TableCell>{(referral.commission_rate * 100).toFixed(2)}%</TableCell>
                        <TableCell>
                          <Badge variant={referral.total_earned > 0 ? 'secondary' : 'outline'}>
                            {formatCurrency(referral.total_earned)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(referral.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReferralDetails(referral)}
                            >
                              Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                fetchReferralTree(referral.referrer_id);
                                setTreeOpen(true);
                              }}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referral Analytics</CardTitle>
            <CardDescription>
              Summary of referral performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-sm text-muted-foreground">Total Referrals</div>
                  <div className="text-2xl font-bold mt-1">{referrals.length}</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-sm text-muted-foreground">Active Referrals</div>
                  <div className="text-2xl font-bold mt-1">
                    {referrals.filter(r => r.total_earned > 0).length}
                  </div>
                </div>
              </div>
              
              <div className="bg-muted rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Total Commissions Paid</div>
                <div className="text-2xl font-bold mt-1">
                  {formatCurrency(referrals.reduce((sum, r) => sum + r.total_earned, 0))}
                </div>
              </div>
              
              <div className="bg-muted rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Average Commission Rate</div>
                <div className="text-2xl font-bold mt-1">
                  {(referrals.reduce((sum, r) => sum + r.commission_rate, 0) / (referrals.length || 1) * 100).toFixed(2)}%
                </div>
              </div>
              
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => {
                  // Find the user with the most referrals
                  const referrerCounts = referrals.reduce((counts, r) => {
                    counts[r.referrer_id] = (counts[r.referrer_id] || 0) + 1;
                    return counts;
                  }, {} as Record<string, number>);
                  
                  if (Object.keys(referrerCounts).length > 0) {
                    const topReferrerId = Object.entries(referrerCounts)
                      .sort((a, b) => b[1] - a[1])[0][0];
                    
                    fetchReferralTree(topReferrerId);
                    setTreeOpen(true);
                  } else {
                    toast({
                      title: 'No Referrals',
                      description: 'There are no referrals to visualize.',
                    });
                  }
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                View Top Referrer Tree
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Details Modal */}
      {selectedReferral && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Referral Details</DialogTitle>
              <DialogDescription>
                ID: {selectedReferral.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Referrer</h4>
                  <p>{selectedReferral.referrer_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedReferral.referrer_email}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Referred User</h4>
                  <p>{selectedReferral.referred_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedReferral.referred_email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Date Created</h4>
                  <p>{formatDate(selectedReferral.created_at)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Total Earned</h4>
                  <Badge variant={selectedReferral.total_earned > 0 ? 'secondary' : 'outline'}>
                    {formatCurrency(selectedReferral.total_earned)}
                  </Badge>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium mb-1">Commission Rate</h4>
                  {!editMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditMode(true)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {editMode ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditMode(false)}
                      disabled={processingAction}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      onClick={handleUpdateCommissionRate}
                      disabled={processingAction}
                    >
                      {processingAction ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <p>{(selectedReferral.commission_rate * 100).toFixed(2)}%</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  fetchReferralTree(selectedReferral.referrer_id);
                  setTreeOpen(true);
                  setDetailsOpen(false);
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                View Referral Tree
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Referral Tree Modal */}
      <Dialog open={treeOpen} onOpenChange={setTreeOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Referral Tree</DialogTitle>
            {selectedUser && (
              <DialogDescription>
                Showing referral network for {selectedUser.full_name}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="overflow-auto max-h-[70vh]">
            {treeLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : referralTree ? (
              <div className="p-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="font-medium text-lg">{referralTree.name}</div>
                  <div className="text-sm text-muted-foreground">{referralTree.email}</div>
                  <div className="text-sm mt-1">
                    <span className="text-muted-foreground">Referral Code: </span>
                    <span className="font-mono">{referralTree.referral_code}</span>
                  </div>
                  {referralTree.total_earned > 0 && (
                    <div className="text-sm mt-1">
                      <span className="text-muted-foreground">Total Earned: </span>
                      <span className="font-medium">{formatCurrency(referralTree.total_earned)}</span>
                    </div>
                  )}
                </div>
                
                {referralTree.children.length > 0 ? (
                  <div className="mt-4">
                    {referralTree.children.map(child => renderReferralTreeNode(child))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No referrals found for this user
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No referral data available
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTreeOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="default"
              onClick={() => {
                // Export tree as CSV
                if (!referralTree) return;
                
                const flattenTree = (node: ReferralTreeNode, rows: string[][] = []) => {
                  rows.push([
                    node.name,
                    node.email,
                    node.referral_code,
                    node.level.toString(),
                    node.total_earned.toFixed(2)
                  ]);
                  
                  node.children.forEach(child => flattenTree(child, rows));
                  return rows;
                };
                
                const headers = ['Name', 'Email', 'Referral Code', 'Level', 'Total Earned'];
                const rows = flattenTree(referralTree);
                
                const csvContent = [
                  headers.join(','),
                  ...rows.map(row => row.join(','))
                ].join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `referral_tree_${referralTree.referral_code}_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Tree
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReferralsManagement;