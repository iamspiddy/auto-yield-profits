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
  Camera, 
  Eye, 
  EyeOff,
  Calendar,
  Wallet,
  Award,
  FileText,
  AlertCircle
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
  kyc_status: 'not_submitted' | 'pending' | 'verified' | 'rejected';
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
  const [kycIdFile, setKycIdFile] = useState<File | null>(null);
  const [kycSelfieFile, setKycSelfieFile] = useState<File | null>(null);

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
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchReferralStats = async () => {
    if (!user) return;
    
    try {
      const { data: referrals } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id);

      const { data: earnings } = await supabase
        .from('referral_earnings')
        .select('amount')
        .eq('referrer_id', user.id);

      setReferralStats({
        totalReferrals: referrals?.length || 0,
        totalEarnings: earnings?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0,
        referralCode: user.id.slice(0, 8).toUpperCase()
      });
    } catch (error) {
      console.error('Error fetching referral stats:', error);
    }
  };

  const fetchWalletBalance = async () => {
    if (!user) return;
    
    try {
      // Fetch approved deposits only (wallet balance = deposited funds only)
      const { data: deposits } = await supabase
        .from('deposits')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      // Fetch completed withdrawals to subtract from deposited amount
      const { data: completedWithdrawals } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      // Get pending withdrawals to subtract from available balance
      const { data: pendingWithdrawals } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing']);

      // Calculate wallet balance: deposited funds only
      const totalDeposits = deposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
      const totalCompletedWithdrawals = completedWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
      const walletBalance = totalDeposits - totalCompletedWithdrawals;
      const pendingWithdrawalsAmount = pendingWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;

      setWalletBalance(walletBalance - pendingWithdrawalsAmount);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      let avatarUrl = profileData?.avatar_url;

      // Upload avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/avatar.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;
        avatarUrl = uploadData.path;
      }

      // Update profile - use update instead of upsert since profile should already exist
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: username,
          email: user.email,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated."
      });

      // Refresh profile data
      await fetchProfileData();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile.",
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
        title: "Passwords Don't Match",
        description: "New password and confirm password must be the same.",
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
        description: "Your password has been successfully updated."
      });

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: "Password Update Failed",
        description: error.message || "Failed to update password.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleKycUpload = async () => {
    if (!user) return;
    
    if (!kycIdFile || !kycSelfieFile) {
      toast({
        title: "Missing Documents",
        description: "Please upload both ID and selfie documents.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Upload KYC documents
      const idFileExt = kycIdFile.name.split('.').pop();
      const selfieFileExt = kycSelfieFile.name.split('.').pop();
      
      const idFileName = `${user.id}/kyc_id.${idFileExt}`;
      const selfieFileName = `${user.id}/kyc_selfie.${selfieFileExt}`;

      const { error: idUploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(idFileName, kycIdFile);

      const { error: selfieUploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(selfieFileName, kycSelfieFile);

      if (idUploadError || selfieUploadError) throw idUploadError || selfieUploadError;

      // Update KYC status
      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'pending',
          kyc_verified: false,
          kyc_id_url: idFileName,
          kyc_selfie_url: selfieFileName,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "KYC Documents Submitted",
        description: "Your KYC documents have been submitted for review."
      });

      // Clear files
      setKycIdFile(null);
      setKycSelfieFile(null);
      
      // Refresh profile data
      await fetchProfileData();
    } catch (error: any) {
      toast({
        title: "KYC Upload Failed",
        description: error.message || "Failed to upload KYC documents.",
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
        title: "Link Copied",
        description: "Referral link has been copied to clipboard."
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link. Please copy manually.",
        variant: "destructive"
      });
    }
  };

  const getKycStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      verified: "default",
      pending: "secondary",
      rejected: "destructive",
      not_submitted: "outline"
    };

    const labels: Record<string, string> = {
      verified: "Verified",
      pending: "Pending Review",
      rejected: "Rejected",
      not_submitted: "Not Submitted"
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || "Unknown"}
      </Badge>
    );
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

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">My Account</h1>
          <p className="text-muted-foreground">Manage your profile, security, and account settings</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="kyc">KYC</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage 
                      src={profileData?.avatar_url ? 
                        `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profileData.avatar_url}` : 
                        undefined
                      } 
                    />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Profile Picture</Label>
                    <FileUpload
                      onFileChange={setAvatarFile}
                      accept="image/*"
                      maxSize={2 * 1024 * 1024} // 2MB
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG up to 2MB
                    </p>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username (Optional)</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={profileData?.email || user.email}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email address cannot be changed
                  </p>
                </div>

                <Button onClick={handleProfileUpdate} disabled={saving} className="w-full">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Password Change */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Change Password</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPasswords ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPasswords(!showPasswords)}
                        >
                          {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                    </div>
                    <Button onClick={handlePasswordChange} disabled={saving} className="w-full">
                      {saving ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </div>

                {/* 2FA Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">Two-Factor Authentication</h4>
                    <p className="text-xs text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={setTwoFactorEnabled}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Referral Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <Users className="h-8 w-8 mx-auto text-primary mb-2" />
                    <p className="text-2xl font-bold">{referralStats.totalReferrals}</p>
                    <p className="text-sm text-muted-foreground">Total Referrals</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/10 rounded-lg">
                    <Award className="h-8 w-8 mx-auto text-green-600 mb-2" />
                    <p className="text-2xl font-bold text-green-600">${referralStats.totalEarnings.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                  </div>
                  <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                    <FileText className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{referralStats.referralCode}</p>
                    <p className="text-sm text-muted-foreground">Referral Code</p>
                  </div>
                </div>

                {/* Referral Link */}
                <div className="space-y-2">
                  <Label>Your Referral Link</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={referralLink}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyReferralLink}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  View Referral History
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* KYC Tab */}
          <TabsContent value="kyc" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  KYC Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* KYC Status */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">Verification Status</h4>
                    <p className="text-xs text-muted-foreground">
                      Complete KYC to unlock all platform features
                    </p>
                  </div>
                  {getKycStatusBadge(profileData?.kyc_status || 'not_submitted')}
                </div>

                {profileData?.kyc_status === 'not_submitted' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-600">KYC Required</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Please upload your identification documents to verify your account.
                      </p>
                    </div>

                    {/* KYC Upload Forms */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Government ID</Label>
                        <FileUpload
                          onFileChange={setKycIdFile}
                          accept="image/*,.pdf"
                          maxSize={5 * 1024 * 1024} // 5MB
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Selfie with ID</Label>
                        <FileUpload
                          onFileChange={setKycSelfieFile}
                          accept="image/*"
                          maxSize={5 * 1024 * 1024} // 5MB
                        />
                      </div>
                      <Button onClick={handleKycUpload} disabled={saving} className="w-full">
                        {saving ? 'Submitting...' : 'Submit KYC Documents'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Link to dedicated KYC page */}
                <div className="text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/kyc')}
                    className="w-full"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Go to KYC Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Account Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Account Created</Label>
                <p className="text-sm text-muted-foreground">
                  {profileData?.created_at ? formatDate(profileData.created_at) : 'N/A'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Last Login</Label>
                <p className="text-sm text-muted-foreground">
                  {profileData?.last_login ? formatDate(profileData.last_login) : 'N/A'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Wallet Balance</Label>
                <p className="text-sm text-muted-foreground">
                  ${walletBalance.toFixed(2)} USDT
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">User ID</Label>
                <p className="text-sm text-muted-foreground font-mono">
                  {user.id.slice(0, 8)}...{user.id.slice(-8)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile; 