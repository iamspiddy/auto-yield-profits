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
  Users2,
  Search,
  TrendingUp,
  DollarSign,
  User,
  Calendar,
  Eye,
  Download,
  BarChart3,
  Users,
  Award
} from 'lucide-react';

interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  commission_rate: number | null;
  total_earned: number | null;
  created_at: string;
  referrer?: {
    email: string;
    full_name: string;
  };
  referred?: {
    email: string;
    full_name: string;
  };
}

interface ReferralStats {
  totalReferrals: number;
  totalEarnings: number;
  activeReferrers: number;
  conversionRate: number;
}

const AdminReferrals = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalEarnings: 0,
    activeReferrers: 0,
    conversionRate: 0
  });

  useEffect(() => {
    fetchReferrals();
  }, []);

  useEffect(() => {
    filterReferrals();
  }, [referrals, searchTerm]);

  const fetchReferrals = async () => {
    try {
      setLoading(true);

      const { data: referralsData, error } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately to avoid relationship issues
      const referralsWithUsers = await Promise.all(
        referralsData.map(async (referral) => {
          const { data: referrer } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', referral.referrer_id)
            .single();

          const { data: referred } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', referral.referred_id)
            .single();

          return {
            ...referral,
            referrer: referrer || { email: 'Unknown', full_name: 'Unknown User' },
            referred: referred || { email: 'Unknown', full_name: 'Unknown User' }
          };
        })
      );

      setReferrals(referralsWithUsers);

      // Calculate stats
      const totalReferrals = referralsData.length;
      const totalEarnings = referralsData.reduce((sum, r) => sum + (r.total_earned || 0), 0);
      const uniqueReferrers = new Set(referralsData.map(r => r.referrer_id)).size;
      const conversionRate = totalReferrals > 0 ? (uniqueReferrers / totalReferrals) * 100 : 0;

      setStats({
        totalReferrals,
        totalEarnings,
        activeReferrers: uniqueReferrers,
        conversionRate
      });
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast({
        title: "Error",
        description: "Failed to load referrals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterReferrals = () => {
    let filtered = referrals;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(referral =>
        referral.referrer?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.referrer?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.referred?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.referred?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredReferrals(filtered);
  };

  const exportReferrals = () => {
    const csvContent = [
      ['Referrer', 'Referred', 'Commission Rate', 'Total Earned', 'Date'],
      ...filteredReferrals.map(r => [
        r.referrer?.email || '',
        r.referred?.email || '',
        `${(r.commission_rate || 0) * 100}%`,
        `$${(r.total_earned || 0).toFixed(2)}`,
        formatDate(r.created_at)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'referrals.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Referrals data exported to CSV",
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
      day: 'numeric'
    });
  };

  const getTopReferrers = () => {
    const referrerStats = referrals.reduce((acc, referral) => {
      const referrerId = referral.referrer_id;
      if (!acc[referrerId]) {
        acc[referrerId] = {
          email: referral.referrer?.email || '',
          name: referral.referrer?.full_name || '',
          referrals: 0,
          earnings: 0
        };
      }
      acc[referrerId].referrals += 1;
      acc[referrerId].earnings += referral.total_earned || 0;
      return acc;
    }, {} as Record<string, { email: string; name: string; referrals: number; earnings: number }>);

    return Object.values(referrerStats)
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Referral Program</h1>
          <p className="text-gray-400 mt-2">Monitor referral program performance and earnings</p>
        </div>
        <Button onClick={exportReferrals} variant="outline" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Referrals</CardTitle>
            <Users2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalReferrals}</div>
            <div className="text-xs text-gray-400 mt-1">Successful referrals</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalEarnings)}</div>
            <div className="text-xs text-gray-400 mt-1">Commission paid out</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Active Referrers</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.activeReferrers}</div>
            <div className="text-xs text-gray-400 mt-1">Users with referrals</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Conversion Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.conversionRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-400 mt-1">Referral success rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Referrers */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Top Referrers</CardTitle>
          <CardDescription className="text-gray-400">
            Users with highest referral earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getTopReferrers().map((referrer, index) => (
              <div key={referrer.email} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full">
                    <Award className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{referrer.name}</p>
                    <p className="text-sm text-gray-400">{referrer.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{formatCurrency(referrer.earnings)}</p>
                  <p className="text-sm text-gray-400">{referrer.referrals} referrals</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by referrer or referred user email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">All Referrals</CardTitle>
          <CardDescription className="text-gray-400">
            Complete list of referral relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Referrer</TableHead>
                <TableHead className="text-gray-300">Referred User</TableHead>
                <TableHead className="text-gray-300">Commission Rate</TableHead>
                <TableHead className="text-gray-300">Earnings</TableHead>
                <TableHead className="text-gray-300">Date</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferrals.map((referral) => (
                <TableRow key={referral.id} className="border-gray-700">
                  <TableCell>
                    <div>
                      <div className="font-medium text-white">{referral.referrer?.full_name}</div>
                      <div className="text-sm text-gray-400">{referral.referrer?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-white">{referral.referred?.full_name}</div>
                      <div className="text-sm text-gray-400">{referral.referred?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {((referral.commission_rate || 0) * 100).toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                      {formatCurrency(referral.total_earned || 0)}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {formatDate(referral.created_at)}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-800 border-gray-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">Referral Details</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            View detailed referral information
                          </DialogDescription>
                        </DialogHeader>
                        {referral && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-300">Referrer</label>
                                <p className="text-white">{referral.referrer?.full_name}</p>
                                <p className="text-gray-400 text-sm">{referral.referrer?.email}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-300">Referred User</label>
                                <p className="text-white">{referral.referred?.full_name}</p>
                                <p className="text-gray-400 text-sm">{referral.referred?.email}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-300">Commission Rate</label>
                                <p className="text-white">{((referral.commission_rate || 0) * 100).toFixed(1)}%</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-300">Total Earned</label>
                                <p className="text-white">{formatCurrency(referral.total_earned || 0)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-300">Date</label>
                                <p className="text-white">{formatDate(referral.created_at)}</p>
                              </div>
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

export default AdminReferrals; 