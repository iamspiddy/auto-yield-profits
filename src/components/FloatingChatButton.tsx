import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";
import { useState } from "react";

const FloatingChatButton = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const openChat = () => {
    // Trigger JivoChat widget
    if (window.jivo_open) {
      window.jivo_open();
    } else {
      // Fallback: scroll to bottom where chat widget should be visible
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9998]">
      {isExpanded ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 mb-3 min-w-[200px]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">Need Help?</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Our support team is here to help you 24/7. Get instant answers to your questions.
          </p>
          <Button
            onClick={openChat}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Start Chat
          </Button>
        </div>
      ) : null}
      
      <Button
        onClick={isExpanded ? openChat : toggleExpanded}
        className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
        aria-label="Chat with support"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default FloatingChatButton;
