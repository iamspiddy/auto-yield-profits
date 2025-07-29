import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, User, Loader2 } from 'lucide-react';

type UserProfile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  kyc_verified: boolean | null;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
};

type UserDetails = {
  profile: UserProfile;
  deposits: any[];
  withdrawals: any[];
  earnings: any[];
  balance: number;
};

const UsersManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch user deposits
      const { data: deposits, error: depositsError } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (depositsError) throw depositsError;

      // Fetch user withdrawals
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      // Fetch user earnings
      const { data: earnings, error: earningsError } = await supabase
        .from('earnings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (earningsError) throw earningsError;

      // Calculate user balance
      const totalDeposits = deposits
        .filter(d => d.status === 'approved')
        .reduce((sum, d) => sum + d.amount, 0);
      
      const totalWithdrawals = withdrawals
        .filter(w => w.status === 'completed')
        .reduce((sum, w) => sum + w.amount, 0);
      
      const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
      
      const balance = totalDeposits + totalEarnings - totalWithdrawals;

      setSelectedUser({
        profile,
        deposits: deposits || [],
        withdrawals: withdrawals || [],
        earnings: earnings || [],
        balance
      });

      setUserDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    // Apply search filter
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply KYC filter
    if (filter === 'verified' && !user.kyc_verified) return false;
    if (filter === 'unverified' && user.kyc_verified) return false;
    if (filter === 'referred' && !user.referred_by) return false;
    
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          View and manage all users on the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Total users: {users.length}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name or email..."
                  className="pl-8 w-full md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  className="border rounded p-2 text-sm bg-background"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Users</option>
                  <option value="verified">KYC Verified</option>
                  <option value="unverified">Not Verified</option>
                  <option value="referred">Referred Users</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>KYC Status</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.kyc_verified ? (
                          <Badge variant="success">Verified</Badge>
                        ) : (
                          <Badge variant="destructive">Not Verified</Badge>
                        )}
                      </TableCell>
                      <TableCell>{user.referral_code}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchUserDetails(user.user_id)}
                        >
                          View Details
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

      {/* User Details Modal */}
      {selectedUser && (
        <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {selectedUser.profile.full_name}
              </DialogTitle>
              <DialogDescription>
                {selectedUser.profile.email} · Joined {formatDate(selectedUser.profile.created_at)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(selectedUser.balance)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">KYC Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    {selectedUser.profile.kyc_verified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="destructive">Not Verified</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Referral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {selectedUser.profile.referred_by ? (
                      <span>Referred by user ID: {selectedUser.profile.referred_by}</span>
                    ) : (
                      <span>No referrer</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="deposits">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="deposits">Deposits ({selectedUser.deposits.length})</TabsTrigger>
                <TabsTrigger value="withdrawals">Withdrawals ({selectedUser.withdrawals.length})</TabsTrigger>
                <TabsTrigger value="earnings">Earnings ({selectedUser.earnings.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="deposits" className="space-y-4">
                {selectedUser.deposits.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No deposits found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUser.deposits.map((deposit) => (
                        <TableRow key={deposit.id}>
                          <TableCell>{formatDate(deposit.created_at)}</TableCell>
                          <TableCell>{formatCurrency(deposit.amount)}</TableCell>
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="withdrawals" className="space-y-4">
                {selectedUser.withdrawals.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No withdrawals found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUser.withdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell>{formatDate(withdrawal.created_at)}</TableCell>
                          <TableCell>{formatCurrency(withdrawal.amount)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                withdrawal.status === 'completed' ? 'success' :
                                withdrawal.status === 'rejected' ? 'destructive' : 'outline'
                              }
                            >
                              {withdrawal.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="earnings" className="space-y-4">
                {selectedUser.earnings.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No earnings found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUser.earnings.map((earning) => (
                        <TableRow key={earning.id}>
                          <TableCell>{formatDate(earning.earnings_date)}</TableCell>
                          <TableCell>{formatCurrency(earning.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UsersManagement;