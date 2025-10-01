import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Shield, 
  Users, 
  Copy, 
  Check, 
  Upload, 
  Eye, 
  EyeOff,
  Calendar,
  Wallet,
  Award,
  FileText,
  PlayCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import FileUpload from '@/components/ui/file-upload';

interface ProfileData {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  created_at: string;
  last_login?: string;
}

interface ReferralStats {
  totalReferrals: number;
  totalEarnings: number;
  referralCode: string;
}

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalEarnings: 0,
    referralCode: ''
  });
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const referralLink = `${window.location.origin}/auth?ref=${user?.id}`;

  useEffect(() => {
    if (!user) return;
    fetchProfileData();
    fetchReferralStats();
    fetchWalletBalance();
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;
    
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setProfileData(data);
      setFullName(data.full_name || '');
      setUsername(data.username || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive"
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchReferralStats = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setReferralStats({
        totalReferrals: 0,
        totalEarnings: 0,
        referralCode: data.referral_code || ''
      });
    } catch (error) {
      console.error('Error fetching referral stats:', error);
    }
  };

  const fetchWalletBalance = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setWalletBalance(data.balance || 0);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // First, check if username is being changed and if it's already taken
      if (username && username !== profileData?.username) {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('username', username)
          .neq('user_id', user.id)
          .single();

        if (existingUser) {
          toast({
            title: "Username Taken",
            description: "This username is already taken. Please choose a different one.",
            variant: "destructive"
          });
          return;
        }
      }

      // Handle avatar upload first if file is selected
      let avatarUrl = profileData?.avatar_url;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, {
            upsert: true // This will overwrite existing avatar
          });

        if (uploadError) throw uploadError;
        avatarUrl = fileName;
      }

      // Update profile with all fields in a single operation
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: username || null, // Allow null username
          avatar_url: avatarUrl
        })
        .eq('user_id', user.id);

      if (error) {
        // Handle specific database errors
        if (error.code === '23505' && error.message.includes('profiles_username_key')) {
          toast({
            title: "Username Conflict",
            description: "This username is already taken. Please choose a different one.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully."
      });

      fetchProfileData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation password do not match.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully."
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Password Update Failed",
        description: "Failed to update password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard."
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy referral link.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
            <p className="text-gray-400">Manage your account settings and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profileData?.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {profileData?.full_name?.charAt(0) || user.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-white">
                      {profileData?.full_name || 'User'}
                    </h3>
                    <p className="text-gray-400">{user.email}</p>
                  </div>

                  <div className="w-full space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Member since:</span>
                      <span className="text-white">
                        {profileData?.created_at ? formatDate(profileData.created_at) : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Last login:</span>
                      <span className="text-white">
                        {profileData?.last_login ? formatDate(profileData.last_login) : 'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Balance:</span>
                      <span className="text-white">${walletBalance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 bg-gray-800">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="referrals">Referrals</TabsTrigger>
                <TabsTrigger value="help">Help</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Profile Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-gray-300">Username</Label>
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Profile Picture</Label>
                      <FileUpload
                        onFileChange={setAvatarFile}
                        accept="image/*"
                        className="bg-gray-700 border-gray-600"
                      />
                    </div>

                    <Button onClick={handleProfileUpdate} disabled={saving} className="w-full">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Password Change */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-300">Change Password</h4>
                      
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword" className="text-gray-300">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              type={showPasswords ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="bg-gray-700 border-gray-600 text-white pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowPasswords(!showPasswords)}
                            >
                              {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
                          <Input
                            id="newPassword"
                            type={showPasswords ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type={showPasswords ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </div>

                        <Button onClick={handlePasswordChange} disabled={saving} className="w-full">
                          {saving ? 'Updating...' : 'Update Password'}
                        </Button>
                      </div>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-300">Two-Factor Authentication</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                        </div>
                        <Switch
                          checked={twoFactorEnabled}
                          onCheckedChange={setTwoFactorEnabled}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Referrals Tab */}
              <TabsContent value="referrals" className="space-y-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Referral Program
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Referral Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-white">{referralStats.totalReferrals}</div>
                        <div className="text-sm text-gray-400">Total Referrals</div>
                      </div>
                      
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-white">${referralStats.totalEarnings.toFixed(2)}</div>
                        <div className="text-sm text-gray-400">Total Earnings</div>
                      </div>
                      
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-white">5%</div>
                        <div className="text-sm text-gray-400">Commission Rate</div>
                      </div>
                    </div>

                    {/* Referral Link */}
                    <div className="space-y-3">
                      <Label className="text-gray-300">Your Referral Link</Label>
                      <div className="flex gap-2">
                        <Input
                          value={referralLink}
                          readOnly
                          className="bg-gray-700 border-gray-600 text-white flex-1"
                        />
                        <Button
                          onClick={handleCopyReferralLink}
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Referral Code */}
                    <div className="space-y-3">
                      <Label className="text-gray-300">Your Referral Code</Label>
                      <div className="flex gap-2">
                        <Input
                          value={referralStats.referralCode}
                          readOnly
                          className="bg-gray-700 border-gray-600 text-white flex-1"
                        />
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(referralStats.referralCode);
                            toast({
                              title: "Copied!",
                              description: "Referral code copied to clipboard."
                            });
                          }}
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Help Tab */}
              <TabsContent value="help" className="space-y-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <HelpCircle className="h-5 w-5" />
                      Help & Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    {/* Quick Tips */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-300">Quick Tips</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-700 rounded-lg">
                          <h5 className="text-white font-medium mb-1">💡 Minimum Investment</h5>
                          <p className="text-sm text-gray-400">
                            You need at least $200 to start investing in any plan
                          </p>
                        </div>
                        <div className="p-3 bg-gray-700 rounded-lg">
                          <h5 className="text-white font-medium mb-1">📈 Compound Growth</h5>
                          <p className="text-sm text-gray-400">
                            Weekly profits are automatically reinvested for maximum growth
                          </p>
                        </div>
                        <div className="p-3 bg-gray-700 rounded-lg">
                          <h5 className="text-white font-medium mb-1">⏰ Investment Duration</h5>
                          <p className="text-sm text-gray-400">
                            Choose from 1 month to 12 months - longer durations mean bigger returns
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Support Contact */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-300">Need Help?</h4>
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-400 mb-3">
                          If you have any questions or need assistance, our support team is here to help.
                        </p>
                        <Button
                          onClick={() => {
                            // Try to open chat widget
                            if (window.smartsupp && typeof window.smartsupp === 'function') {
                              try {
                                window.smartsupp('chat:open');
                              } catch (error) {
                                console.log('Chat widget not available');
                              }
                            }
                            toast({
                              title: "Opening Support",
                              description: "Connecting you to our support team...",
                            });
                          }}
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-600"
                        >
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Contact Support
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile; 