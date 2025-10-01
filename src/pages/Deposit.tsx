import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Headphones, Clock, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Deposit = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [smartsuppReady, setSmartsuppReady] = useState(false);

  // Check if Smartsupp is ready
  useEffect(() => {
    const checkSmartsupp = () => {
      if (window.smartsupp && typeof window.smartsupp === 'function') {
        setSmartsuppReady(true);
      } else {
        // Retry after a short delay
        setTimeout(checkSmartsupp, 1000);
      }
    };

    // Start checking after component mounts
    const timer = setTimeout(checkSmartsupp, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const openChat = () => {
    // Show toast notification
    toast({
      title: "Opening Chat",
      description: "Connecting you to our support team for funding assistance...",
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
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center justify-center">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              Contact Customer Support for Funding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Message */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Headphones className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Need to Fund Your Account?
              </h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Our dedicated support team is here to help you with all funding requests. 
                Contact us for personalized assistance and secure account funding.
              </p>
            </div>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 dark:text-white">24/7 Support</h3>
                <p className="text-sm text-muted-foreground">Available round the clock</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-blue-800/20 rounded-lg">
                <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Secure Process</h3>
                <p className="text-sm text-muted-foreground">Safe and verified funding</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                <MessageCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Instant Help</h3>
                <p className="text-sm text-muted-foreground">Quick response times</p>
              </div>
            </div>

            {/* Contact Support Button */}
            <div className="text-center space-y-4">
              <Button 
                onClick={openChat}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Chat with Support Now
              </Button>
              <p className="text-sm text-muted-foreground">
                Our support team will guide you through the funding process
              </p>
            </div>

            {/* Additional Information */}
            <div className="bg-muted/50 p-6 rounded-lg space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">What to expect:</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Provide your account details and funding amount</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Receive secure payment instructions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Get confirmation once funds are received</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Start earning with your funded account</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Deposit; 