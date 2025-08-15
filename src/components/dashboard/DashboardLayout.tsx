import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Wallet, TrendingUp, History, Users, Settings } from 'lucide-react';
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

  useEffect(() => {
    if (!user) return;
    fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
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
  };

  const handleSignOut = async () => {
    try {
      await signOut();
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

          <div className="flex items-center space-x-4">
                               <div className="hidden md:flex items-center space-x-3">
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
        </div>
      </header>

      {/* Navigation Pills */}
      <div className="container mx-auto px-4 py-4">
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