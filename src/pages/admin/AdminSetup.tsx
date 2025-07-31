import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addAdminRoleToCurrentUser, checkCurrentUserAdmin, listAdminUsers, debugUserRoles } from '@/utils/adminSetup';
import { Shield, Users, CheckCircle, XCircle } from 'lucide-react';

const AdminSetup = () => {
  const [loading, setLoading] = useState(false);
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
    fetchAdminUsers();
    fetchDebugInfo();
  }, []);

  const checkAdminStatus = async () => {
    const result = await checkCurrentUserAdmin();
    setAdminStatus(result.isAdmin);
  };

  const fetchAdminUsers = async () => {
    const result = await listAdminUsers();
    if (result.success) {
      setAdminUsers(result.data || []);
    }
  };

  const fetchDebugInfo = async () => {
    const result = await debugUserRoles();
    if (result.success) {
      setDebugInfo(result);
    }
  };

  const handleAddAdminRole = async () => {
    setLoading(true);
    try {
      const result = await addAdminRoleToCurrentUser();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Admin role added successfully!",
        });
        await checkAdminStatus();
        await fetchAdminUsers();
        await fetchDebugInfo();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add admin role",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding admin role:', error);
      toast({
        title: "Error",
        description: "Failed to add admin role",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Admin Setup</CardTitle>
            <CardDescription className="text-center">
              Please log in to access admin setup
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Admin Setup</h1>
        <p className="text-gray-400">Configure admin access for the current user</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current User Status */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="h-5 w-5" />
              Current User Status
            </CardTitle>
            <CardDescription className="text-gray-400">
              {user.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Admin Status:</span>
              {adminStatus === null ? (
                <Badge variant="secondary">Checking...</Badge>
              ) : adminStatus ? (
                <Badge className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Admin
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Not Admin
                </Badge>
              )}
            </div>

            {adminStatus === false && (
              <Button 
                onClick={handleAddAdminRole} 
                disabled={loading}
                className="w-full"
              >
                {loading ? "Adding Admin Role..." : "Add Admin Role"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Admin Users List */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5" />
              Admin Users
            </CardTitle>
            <CardDescription className="text-gray-400">
              {adminUsers.length} admin user(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {adminUsers.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No admin users found</p>
            ) : (
              <div className="space-y-2">
                {adminUsers.map((adminUser, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <span className="text-gray-300">{adminUser.email}</span>
                    <Badge variant="outline">Admin</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Debug Information */}
      {debugInfo && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Debug Information</CardTitle>
            <CardDescription className="text-gray-400">
              Technical details for troubleshooting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-gray-300">
              <p><strong>User ID:</strong> {debugInfo.currentUser?.id}</p>
              <p><strong>User Roles:</strong> {JSON.stringify(debugInfo.userRoles)}</p>
              <p><strong>Profile:</strong> {JSON.stringify(debugInfo.profile)}</p>
              <p><strong>All Admin Roles:</strong> {JSON.stringify(debugInfo.allAdminRoles)}</p>
              {Object.entries(debugInfo.errors).map(([key, error]) => (
                <p key={key}><strong>Error {key}:</strong> {JSON.stringify(error)}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300">
          <p>1. If you're not an admin, click "Add Admin Role" to grant yourself admin privileges</p>
          <p>2. Once you have admin access, you can access the admin panel at /admin/dashboard</p>
          <p>3. Admin users can manage users, deposits, withdrawals, and system settings</p>
          <p className="text-yellow-400">⚠️ This setup is for development/testing purposes only</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetup; 