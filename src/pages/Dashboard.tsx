import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BalanceManagement from '@/components/dashboard/BalanceManagement';
import ActiveInvestmentPlan from '@/components/dashboard/ActiveInvestmentPlan';
import EarningsTracker from '@/components/dashboard/EarningsTracker';
import LiveNotifications from '@/components/dashboard/LiveNotifications';
import { DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
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
          </div>

          {/* Live Notifications */}
          <LiveNotifications />
        </div>

      </DashboardLayout>
    </RefreshContext.Provider>
  );
};

export default Dashboard;