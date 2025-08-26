import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Headphones, Clock, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DepositPanel = () => {
  const openChat = () => {
    // Show toast notification
    toast({
      title: "Opening Chat",
      description: "Connecting you to our support team for funding assistance...",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="h-5 w-5 mr-2 text-blue-600" />
          Contact Support for Funding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Message */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
            <Headphones className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Need to Fund Your Account?
          </h3>
          <p className="text-sm text-muted-foreground">
            Our support team is here to help you with all funding requests. 
            Contact us for personalized assistance.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
            <Clock className="h-6 w-6 text-blue-600 mx-auto mb-1" />
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white">24/7 Support</h4>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
            <Shield className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Secure Process</h4>
          </div>
        </div>

        {/* Contact Support Button */}
        <Button 
          onClick={openChat}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Chat with Support
        </Button>

        {/* Additional Info */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            Our team will guide you through the secure funding process
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DepositPanel;