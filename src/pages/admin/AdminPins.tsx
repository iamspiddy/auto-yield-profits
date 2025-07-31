import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Key,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
  User,
  Calendar
} from 'lucide-react';

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
}

interface WithdrawalPin {
  id: string;
  user_id: string;
  pin: string;
  is_used: boolean;
  expires_at: string;
  created_at: string;
  user?: {
    email: string;
    full_name: string;
  };
}

const AdminPins = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [expiresInHours, setExpiresInHours] = useState('24');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [pins, setPins] = useState<WithdrawalPin[]>([]);
  const [generatedPin, setGeneratedPin] = useState<string>('');
  const [showPinDialog, setShowPinDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
    fetchPins();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users for PIN generation...');

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching profiles:', error);
        throw error;
      }

      console.log('Fetched profiles:', profiles);
      setUsers(profiles || []);
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

  const fetchPins = async () => {
    try {
      console.log('Fetching PINs...');
      
      const { data: pinsData, error } = await supabase
        .from('withdrawal_pins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for PINs
      const pinsWithUsers = await Promise.all(
        pinsData.map(async (pin) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', pin.user_id)
            .single();

          return {
            ...pin,
            user: profile || { email: 'Unknown', full_name: 'Unknown User' }
          };
        })
      );

      setPins(pinsWithUsers);
    } catch (error) {
      console.error('Error fetching PINs:', error);
      toast({
        title: "Error",
        description: "Failed to load PINs",
        variant: "destructive"
      });
    }
  };

  const handleGeneratePin = async () => {
    if (!user || !selectedUser) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive"
      });
      return;
    }

    try {
      setProcessing(true);

      const hours = parseInt(expiresInHours);
      if (isNaN(hours) || hours < 1 || hours > 168) { // Max 7 days
        toast({
          title: "Invalid Expiration",
          description: "Please enter a valid expiration time (1-168 hours)",
          variant: "destructive"
        });
        return;
      }

      // Generate PIN
      const { data: pin, error } = await supabase
        .rpc('generate_withdrawal_pin', {
          _user_id: selectedUser,
          _expires_in_hours: hours
        });

      if (error) throw error;

      setGeneratedPin(pin);
      setShowPinDialog(true);

      toast({
        title: "PIN Generated",
        description: `PIN generated successfully for user`,
      });

      // Refresh PINs list
      fetchPins();
    } catch (error) {
      console.error('Error generating PIN:', error);
      toast({
        title: "Error",
        description: "Failed to generate PIN",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "PIN copied to clipboard",
    });
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

  const getStatusBadge = (isUsed: boolean, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (isUsed) {
      return <Badge variant="secondary">Used</Badge>;
    } else if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    } else {
      return <Badge variant="default">Active</Badge>;
    }
  };

  const getActivePinsCount = () => {
    return pins.filter(pin => !pin.is_used && new Date(pin.expires_at) > new Date()).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Withdrawal PIN Management</h1>
          <p className="text-gray-400">Generate 4-digit PINs for user withdrawals</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {getActivePinsCount()} Active PINs
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generate PIN Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Key className="h-5 w-5" />
              Generate Withdrawal PIN
            </CardTitle>
            <CardDescription className="text-gray-400">
              Create a 4-digit PIN for user withdrawals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{user.full_name}</span>
                        <span className="text-gray-400">({user.email})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresIn">Expires In (Hours)</Label>
              <Input
                id="expiresIn"
                type="number"
                placeholder="24"
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(e.target.value)}
                min="1"
                max="168"
              />
            </div>

            <Button 
              onClick={handleGeneratePin} 
              className="w-full"
              disabled={processing || !selectedUser}
            >
              {processing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Generate PIN
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* PIN History Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Clock className="h-5 w-5" />
              Recent PINs
            </CardTitle>
            <CardDescription className="text-gray-400">
              Recently generated withdrawal PINs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pins.slice(0, 5).map((pin) => (
                <div key={pin.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-white font-medium">{pin.user?.full_name}</p>
                      <p className="text-gray-400 text-sm">{pin.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-white bg-gray-600 px-2 py-1 rounded">
                      {pin.pin}
                    </span>
                    {getStatusBadge(pin.is_used, pin.expires_at)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PIN History Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">PIN History</CardTitle>
          <CardDescription className="text-gray-400">
            Complete history of generated withdrawal PINs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">User</TableHead>
                <TableHead className="text-gray-300">PIN</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Expires</TableHead>
                <TableHead className="text-gray-300">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pins.map((pin) => (
                <TableRow key={pin.id} className="border-gray-700">
                  <TableCell>
                    <div>
                      <div className="font-medium text-white">{pin.user?.full_name}</div>
                      <div className="text-sm text-gray-400">{pin.user?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white bg-gray-600 px-2 py-1 rounded">
                        {pin.pin}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(pin.pin)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(pin.is_used, pin.expires_at)}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {formatDate(pin.expires_at)}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {formatDate(pin.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Generated PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Key className="h-5 w-5" />
              PIN Generated Successfully
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              The withdrawal PIN has been generated. Share this PIN with the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-mono text-white bg-gray-700 px-6 py-4 rounded-lg mb-4">
                {generatedPin}
              </div>
              <p className="text-sm text-gray-400">
                This PIN expires in {expiresInHours} hours
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => copyToClipboard(generatedPin)}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy PIN
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPinDialog(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPins; 