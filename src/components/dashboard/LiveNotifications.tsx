import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, DollarSign, Users, Sparkles } from 'lucide-react';

interface NotificationMessage {
  id: number;
  message: string;
  emoji: string;
  type: 'profit' | 'deposit' | 'withdrawal' | 'milestone';
}

const LiveNotifications: React.FC = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const notifications: NotificationMessage[] = [
    {
      id: 1,
      message: "James just earned $32.50 in weekly profits.",
      emoji: "✅",
      type: "profit"
    },
    {
      id: 2,
      message: "Sarah deposited $120 USDT into her account.",
      emoji: "💸",
      type: "deposit"
    },
    {
      id: 3,
      message: "David withdrew $75 successfully.",
      emoji: "🚀",
      type: "withdrawal"
    },
    {
      id: 4,
      message: "Emily's balance increased to $1,450.00.",
      emoji: "📈",
      type: "milestone"
    },
    {
      id: 5,
      message: "User #2049 earned a profit of $95.00 this morning.",
      emoji: "🧾",
      type: "profit"
    },
    {
      id: 6,
      message: "A new user just earned their first $20 profit.",
      emoji: "🤑",
      type: "milestone"
    },
    {
      id: 7,
      message: "Kevin auto-compounded $60 back into his wallet.",
      emoji: "🔁",
      type: "profit"
    },
    {
      id: 8,
      message: "Samantha hit a new record: $310 profit this month.",
      emoji: "🔥",
      type: "milestone"
    },
    {
      id: 9,
      message: "User #888 just withdrew $500 to their TRC20 wallet.",
      emoji: "💰",
      type: "withdrawal"
    },
    {
      id: 10,
      message: "User from Texas made a deposit of $300 USDT.",
      emoji: "🧑‍💻",
      type: "deposit"
    }
  ];

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % notifications.length);
        setIsVisible(true);
      }, 500); // Wait for fade out before changing message
    }, 7000); // Show each message for 7 seconds

    return () => clearInterval(messageInterval);
  }, [notifications.length]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'profit':
        return 'text-green-500';
      case 'deposit':
        return 'text-blue-500';
      case 'withdrawal':
        return 'text-orange-500';
      case 'milestone':
        return 'text-purple-500';
      default:
        return 'text-green-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'profit':
        return <TrendingUp className="h-4 w-4" />;
      case 'deposit':
        return <DollarSign className="h-4 w-4" />;
      case 'withdrawal':
        return <Users className="h-4 w-4" />;
      case 'milestone':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const currentMessage = notifications[currentMessageIndex];

  // Extract dollar amounts for highlighting
  const messageParts = currentMessage.message.split(/(\$[\d,]+\.?\d*)/);
  
  return (
    <div className="fixed bottom-4 left-2 right-2 sm:left-4 sm:right-auto z-50 max-w-xs sm:max-w-sm">
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg p-3 sm:p-4 shadow-lg"
          >
            <div className="flex items-start space-x-2 sm:space-x-3">
              <div className={`flex-shrink-0 ${getTypeColor(currentMessage.type)}`}>
                {getTypeIcon(currentMessage.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-base sm:text-lg">{currentMessage.emoji}</span>
                  <div className="h-1 w-1 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                  {messageParts.map((part, index) => {
                    if (part.match(/^\$[\d,]+\.?\d*$/)) {
                      return (
                        <span key={index} className="text-green-400 font-semibold">
                          {part}
                        </span>
                      );
                    }
                    return part;
                  })}
                </p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-2 sm:mt-3 h-0.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 7, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveNotifications; 