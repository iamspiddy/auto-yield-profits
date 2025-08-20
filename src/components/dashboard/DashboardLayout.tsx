import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Wallet, TrendingUp, History, Users, Settings, Menu, X, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface ProfileData {
  full_name?: string;
  username?: string;
  avatar_url?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setProfileData(data);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchProfileData();
  }, [user, fetchProfileData]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsMobileMenuOpen(false);
      toast({
        title: "Signed out",
        description: "You've been successfully signed out."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getNavItemStyle = (path: string) => {
    return isActive(path)
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground hover:bg-primary/5 hover:text-primary cursor-pointer";
  };

  const getDisplayName = () => {
    if (profileData?.username) {
      return `@${profileData.username}`;
    }
    if (profileData?.full_name) {
      return profileData.full_name;
    }
    return user?.email || 'User';
  };

  const getAvatarFallback = () => {
    if (profileData?.full_name) {
      return profileData.full_name.charAt(0).toUpperCase();
    }
    if (profileData?.username) {
      return profileData.username.charAt(0).toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-primary to-secondary p-2 rounded-lg">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Forexcomplex
              </h1>
              <p className="text-sm text-muted-foreground">Earn Crypto While You Sleep</p>
            </div>
          </div>

          {/* Desktop Header Controls */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={profileData?.avatar_url ? 
                    `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profileData.avatar_url}` : 
                    undefined
                  } 
                />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getAvatarFallback()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {getDisplayName()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Mobile Hamburger Menu */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={closeMobileMenu}>
          <div className="absolute right-0 top-0 h-full w-80 bg-background border-l border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-6">
              {/* User Profile Section */}
              <div className="flex items-center space-x-3 pb-4 border-b border-border">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={profileData?.avatar_url ? 
                      `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profileData.avatar_url}` : 
                      undefined
                    } 
                  />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getAvatarFallback()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {getDisplayName()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Actions</h3>
                <Button 
                  onClick={() => { navigate('/deposit'); closeMobileMenu(); }}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 text-base font-semibold"
                >
                  <DollarSign className="h-5 w-5 mr-2" />
                  <ArrowUpRight className="h-5 w-5 mr-2" />
                  Deposit Funds
                </Button>
                <Button 
                  onClick={() => { navigate('/withdraw'); closeMobileMenu(); }}
                  variant="outline"
                  className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-white py-3 text-base font-semibold"
                >
                  <ArrowDownLeft className="h-5 w-5 mr-2" />
                  Withdraw Funds
                </Button>
              </div>

              {/* Navigation Links */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Navigation</h3>
                <div 
                  className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${getNavItemStyle('/dashboard')}`}
                  onClick={() => { navigate('/dashboard'); closeMobileMenu(); }}
                >
                  <TrendingUp className="h-4 w-4 mr-3" />
                  Dashboard
                </div>
                <div 
                  className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${getNavItemStyle('/history')}`}
                  onClick={() => { navigate('/history'); closeMobileMenu(); }}
                >
                  <History className="h-4 w-4 mr-3" />
                  History
                </div>
                <div 
                  className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${getNavItemStyle('/referrals')}`}
                  onClick={() => { navigate('/referrals'); closeMobileMenu(); }}
                >
                  <Users className="h-4 w-4 mr-3" />
                  Referrals
                </div>
              </div>

              {/* User Controls */}
              <div className="space-y-3 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Account</h3>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => { navigate('/profile'); closeMobileMenu(); }}
                >
                  <Settings className="h-4 w-4 mr-3" />
                  Profile Settings
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Pills - Hidden on Mobile */}
      <div className="container mx-auto px-4 py-4 hidden md:block">
        <div className="flex flex-wrap gap-2 mb-6">
          <div 
            className={`flex items-center px-3 py-1 rounded-full text-sm transition-colors ${getNavItemStyle('/dashboard')}`}
            onClick={() => navigate('/dashboard')}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Dashboard
          </div>
          <div 
            className={`flex items-center px-3 py-1 rounded-full text-sm transition-colors ${getNavItemStyle('/history')}`}
            onClick={() => navigate('/history')}
          >
            <History className="h-4 w-4 mr-2" />
            History
          </div>
          <div 
            className={`flex items-center px-3 py-1 rounded-full text-sm transition-colors ${getNavItemStyle('/referrals')}`}
            onClick={() => navigate('/referrals')}
          >
            <Users className="h-4 w-4 mr-2" />
            Referrals
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;