import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BalanceManagement from '@/components/dashboard/BalanceManagement';
import ActiveInvestmentPlan from '@/components/dashboard/ActiveInvestmentPlan';
import EarningsTracker from '@/components/dashboard/EarningsTracker';
import TransactionHistory from '@/components/dashboard/TransactionHistory';
import LiveNotifications from '@/components/dashboard/LiveNotifications';
import { Button } from '@/components/ui/button';
import QuickInvestButton from '@/components/dashboard/QuickInvestButton';
import { DollarSign, ArrowUpRight, ArrowDownLeft, RefreshCw, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Create a refresh context
const RefreshContext = createContext<{ refresh: () => void }>({ refresh: () => {} });

export const useRefresh = () => useContext(RefreshContext);

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const handleRefresh = useCallback(() => {
    // Trigger a global refresh event
    window.dispatchEvent(new CustomEvent('dashboard-refresh'));
  }, []);

  const openChat = () => {
    // Show toast notification
    toast({
      title: "Opening Chat",
      description: "Connecting you to our support team...",
    });

    // Try to open Smartsupp chat
    if (window.smartsupp && typeof window.smartsupp === 'function') {
      try {
        window.smartsupp('chat:open');
        return;
      } catch (error) {
        console.log('Smartsupp open failed, trying alternative method');
      }
    }

    // Alternative method: try to find and click the Smartsupp button
    const smartsuppButton = document.querySelector('.smartsupp-widget') as HTMLElement;
    if (smartsuppButton) {
      smartsuppButton.click();
      return;
    }

    // Another alternative: try to find Smartsupp iframe and show it
    const smartsuppIframe = document.querySelector('iframe[src*="smartsuppchat.com"]') as HTMLIFrameElement;
    if (smartsuppIframe) {
      smartsuppIframe.style.display = 'block';
      smartsuppIframe.style.zIndex = '9999';
      return;
    }

    // Fallback: try to trigger Smartsupp through postMessage
    try {
      const smartsuppWidget = document.querySelector('.smartsupp-widget') as HTMLElement;
      if (smartsuppWidget) {
        smartsuppWidget.dispatchEvent(new Event('click'));
        return;
      }
    } catch (error) {
      console.log('PostMessage method failed');
    }

    // Final fallback: scroll to bottom and show a message
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    
    // Show a toast message to guide the user
    setTimeout(() => {
      toast({
        title: "Chat Widget Not Found",
        description: "Please look for the chat widget in the bottom-right corner. If you don't see it, please refresh the page.",
        variant: "destructive"
      });
    }, 1000);
  };

  if (loading) {
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
    <RefreshContext.Provider value={{ refresh: handleRefresh }}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Primary Action Buttons - Desktop */}
          <div className="hidden md:flex flex-col sm:flex-row gap-4 justify-center sm:justify-end mb-6">
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center gap-2"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <QuickInvestButton variant="default" />
            <Button 
              onClick={() => navigate('/deposit')}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 text-lg font-semibold"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              Deposit Funds
            </Button>
            <Button 
              onClick={() => navigate('/withdraw')}
              variant="outline"
              className="flex items-center gap-2 border-2 border-primary text-primary hover:bg-primary hover:text-white px-6 py-3 text-lg font-semibold"
              size="lg"
            >
              <ArrowDownLeft className="h-5 w-5" />
              Withdraw Funds
            </Button>
          </div>

          {/* Mobile Action Buttons */}
          <div className="md:hidden space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <Button 
                onClick={handleRefresh}
                variant="outline"
                className="flex items-center gap-2"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <QuickInvestButton variant="compact" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => navigate('/deposit')}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" />
                Deposit
              </Button>
              <Button 
                onClick={() => navigate('/withdraw')}
                variant="outline"
                className="flex items-center gap-2 border-2 border-primary text-primary hover:bg-primary hover:text-white py-3 text-sm font-semibold"
              >
                <ArrowDownLeft className="h-4 w-4" />
                Withdraw
              </Button>
            </div>
          </div>

          {/* Enhanced Top Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <BalanceManagement 
                onDepositClick={() => navigate('/deposit')}
                onWithdrawClick={() => navigate('/withdraw')}
                onInvestClick={() => navigate('/investments')}
              />
            </div>
            <div>
              <ActiveInvestmentPlan />
            </div>
          </div>

          {/* Rest of Dashboard */}
          <div className="grid grid-cols-1 gap-6">
            <EarningsTracker />
            <TransactionHistory />
          </div>

          {/* Live Notifications */}
          <LiveNotifications />
        </div>

      </DashboardLayout>
    </RefreshContext.Provider>
  );
};

export default Dashboard;