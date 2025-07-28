import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Wallet, TrendingUp, History, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { signOut, user } = useAuth();

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
                AutoYield
              </h1>
              <p className="text-sm text-muted-foreground">Earn Crypto While You Sleep</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-sm">
              <User className="h-4 w-4" />
              <span className="text-muted-foreground">{user?.email}</span>
            </div>
            
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
          <div className="flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Dashboard
          </div>
          <div className="flex items-center px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">
            <History className="h-4 w-4 mr-2" />
            History
          </div>
          <div className="flex items-center px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">
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