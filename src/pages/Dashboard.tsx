import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BalanceOverview from '@/components/dashboard/BalanceOverview';
import EarningsOverview from '@/components/dashboard/EarningsOverview';
import TransactionHistory from '@/components/dashboard/TransactionHistory';
import ReferralProgram from '@/components/dashboard/ReferralProgram';
import LiveNotifications from '@/components/dashboard/LiveNotifications';
import { Button } from '@/components/ui/button';
import { DollarSign, ArrowUpRight, ArrowDownLeft, RefreshCw, MessageCircle } from 'lucide-react';
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

    // Try multiple methods to open JivoChat
    if (window.jivo_open && typeof window.jivo_open === 'function') {
      try {
        window.jivo_open();
        return;
      } catch (error) {
        console.log('JivoChat open failed, trying alternative method');
      }
    }

    // Alternative method: try to find and click the JivoChat button
    const jivoButton = document.querySelector('.jivo-widget') as HTMLElement;
    if (jivoButton) {
      jivoButton.click();
      return;
    }

    // Another alternative: try to find JivoChat iframe and show it
    const jivoIframe = document.querySelector('#jivo-iframe-container iframe') as HTMLIFrameElement;
    if (jivoIframe) {
      jivoIframe.style.display = 'block';
      jivoIframe.style.zIndex = '9999';
      return;
    }

    // Fallback: try to trigger JivoChat through postMessage
    try {
      const jivoWidget = document.querySelector('.jivo-widget') as HTMLElement;
      if (jivoWidget) {
        jivoWidget.dispatchEvent(new Event('click'));
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
          {/* Primary Action Buttons - Hidden on Mobile */}
          <div className="hidden md:flex flex-col sm:flex-row gap-4 justify-center sm:justify-end">
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center gap-2"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button 
              onClick={openChat}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 text-lg font-semibold"
              size="lg"
            >
              <MessageCircle className="h-5 w-5" />
              Contact Support for Funding
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

          {/* Mobile Refresh Button - Positioned above balance overview */}
          <div className="md:hidden flex justify-end">
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center gap-2"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <BalanceOverview />
              <EarningsOverview />
              <TransactionHistory />
            </div>
            
            <div className="space-y-6">
              <ReferralProgram />
            </div>
          </div>

          {/* Live Notifications */}
          <LiveNotifications />
        </div>
      </DashboardLayout>
    </RefreshContext.Provider>
  );
};

export default Dashboard;