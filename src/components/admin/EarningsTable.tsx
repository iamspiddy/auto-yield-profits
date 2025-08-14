import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  User,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';

interface EarningsRecord {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  earnings_date: string;
  description?: string;
  created_at: string;
  user?: {
    email: string;
    full_name: string;
  };
}

interface EarningsTableProps {
  userId?: string; // Optional: if provided, shows only earnings for that user
  limit?: number; // Optional: limit number of records
  showHeader?: boolean; // Optional: show card header
  title?: string; // Optional: custom title
}

const EarningsTable: React.FC<EarningsTableProps> = ({ 
  userId, 
  limit = 50, 
  showHeader = true,
  title = "Earnings History"
}) => {
  const [earnings, setEarnings] = useState<EarningsRecord[]>([]);
  const [filteredEarnings, setFilteredEarnings] = useState<EarningsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchEarnings();
  }, [userId]);

  useEffect(() => {
    filterEarnings();
  }, [earnings, searchTerm, dateFilter, amountFilter]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      console.log('Fetching earnings data...');

      let query = supabase
        .from('earnings')
        .select('*')
        .order('created_at', { ascending: false });

      // If userId is provided, filter by that user
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Apply limit
      query = query.limit(limit);

      const { data: earningsData, error } = await query;

      if (error) {
        console.error('Error fetching earnings:', error);
        throw error;
      }

      console.log('Fetched earnings data:', earningsData);

      // Fetch user details for each earning record
      const earningsWithUsers = await Promise.all(
        (earningsData || []).map(async (earning) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', earning.user_id)
            .single();

          return {
            ...earning,
            user: profile || { email: 'Unknown User', full_name: 'Unknown User' }
          };
        })
      );

      console.log('Earnings with users:', earningsWithUsers);
      setEarnings(earningsWithUsers);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEarnings = () => {
    let filtered = earnings;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(earning =>
        earning.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        earning.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        earning.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(earning => {
            const earningDate = new Date(earning.created_at);
            return earningDate >= today;
          });
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(earning => {
            const earningDate = new Date(earning.created_at);
            return earningDate >= weekAgo;
          });
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(earning => {
            const earningDate = new Date(earning.created_at);
            return earningDate >= monthAgo;
          });
          break;
      }
    }

    // Amount filter
    if (amountFilter !== 'all') {
      const amount = parseFloat(amountFilter);
      if (!isNaN(amount)) {
        filtered = filtered.filter(earning => earning.amount >= amount);
      }
    }

    setFilteredEarnings(filtered);
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

  const getTotalEarnings = () => {
    return filteredEarnings.reduce((sum, earning) => sum + earning.amount, 0);
  };

  const getAverageEarning = () => {
    if (filteredEarnings.length === 0) return 0;
    return getTotalEarnings() / filteredEarnings.length;
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">{title}</CardTitle>
              <CardDescription className="text-gray-400">
                {userId ? 'User earnings history' : 'All earnings records'}
              </CardDescription>
            </div>
            <Button
              onClick={fetchEarnings}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      )}

      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by user or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={amountFilter} onValueChange={setAmountFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Amounts</SelectItem>
              <SelectItem value="10">$10+</SelectItem>
              <SelectItem value="50">$50+</SelectItem>
              <SelectItem value="100">$100+</SelectItem>
              <SelectItem value="500">$500+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-gray-400">Total Earnings</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(getTotalEarnings())}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-gray-400">Average</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(getAverageEarning())}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-gray-400">Records</p>
                <p className="text-lg font-semibold text-white">{filteredEarnings.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">User</TableHead>
                <TableHead className="text-gray-300">Amount</TableHead>
                <TableHead className="text-gray-300">Description</TableHead>
                <TableHead className="text-gray-300">Date</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEarnings.length === 0 ? (
                <TableRow className="border-gray-700">
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-gray-400">
                      <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No earnings records found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEarnings.map((earning) => (
                  <TableRow key={earning.id} className="border-gray-700">
                    <TableCell>
                      <div>
                        <div className="font-medium text-white">{earning.user?.full_name}</div>
                        <div className="text-sm text-gray-400">{earning.user?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                        {formatCurrency(earning.amount)}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {earning.description || 'Profit distribution'}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {formatDate(earning.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-600 text-white">
                        Completed
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EarningsTable; 