import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  createAdminUser, 
  verifyAdminSetup, 
  listAdminUsers,
  removeAdminRole 
} from '@/utils/adminSetup';
import { 
  Shield, 
  UserPlus, 
  CheckCircle, 
  AlertTriangle, 
  Trash2,
  Users,
  Settings
} from 'lucide-react';

const AdminSetup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkSetupStatus();
    loadAdminUsers();
  }, []);

  const checkSetupStatus = async () => {
    setLoading(true);
    try {
      const status = await verifyAdminSetup();
      setSetupStatus(status);
    } catch (error) {
      console.error('Error checking setup status:', error);
      setSetupStatus({ success: false, error: 'Failed to check setup status' });
    } finally {
      setLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    try {
      const result = await listAdminUsers();
      if (result.success) {
        setAdminUsers(result.admins || []);
      }
    } catch (error) {
      console.error('Error loading admin users:', error);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createAdminUser(email, password, fullName);
      
      if (result.success) {
        toast({
          title: "Admin User Created",
          description: `Admin user ${email} created successfully`,
        });
        setEmail('');
        setPassword('');
        setFullName('');
        setShowCreateForm(false);
        loadAdminUsers();
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to create admin user',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating admin user:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this admin user?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await removeAdminRole(userId);
      
      if (result.success) {
        toast({
          title: "Admin Role Removed",
          description: "Admin role removed successfully",
        });
        loadAdminUsers();
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to remove admin role',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error removing admin role:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Setup</h1>
          <p className="text-gray-400">Configure admin access for your platform</p>
        </div>

        {/* Setup Status */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {setupStatus ? (
              setupStatus.success ? (
                <Alert className="border-green-600 bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-400">
                    Admin system is properly configured and ready to use.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-600 bg-red-900/20">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-400">
                    {setupStatus.error}
                    {setupStatus.details && (
                      <div className="mt-2 text-sm text-red-300">
                        Details: {setupStatus.details}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )
            ) : (
              <div className="text-gray-400">Checking system status...</div>
            )}
          </CardContent>
        </Card>

        {/* Admin Users List */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Admin Users ({adminUsers.length})
              </div>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adminUsers.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No admin users found</p>
                <p className="text-sm text-gray-500 mt-2">
                  Create your first admin user to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {adminUsers.map((admin) => (
                  <div
                    key={admin.user_id}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">{admin.email}</p>
                      <p className="text-sm text-gray-400">
                        Added: {new Date(admin.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveAdmin(admin.user_id)}
                      className="text-red-400 border-red-600 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Admin Form */}
        {showCreateForm && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Create New Admin User</CardTitle>
              <CardDescription className="text-gray-400">
                Create a new admin user with full access to the admin panel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (min 6 characters)"
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                    minLength={6}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? 'Creating...' : 'Create Admin User'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="text-center">
          <Button
            onClick={() => navigate('/admin/login')}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Go to Admin Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup; 