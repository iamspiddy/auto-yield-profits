import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Timer
} from 'lucide-react';
import { InvestmentService, type InvestmentWithPlan } from '@/lib/investmentService';

interface InvestmentNotificationsProps {
  investments: InvestmentWithPlan[];
}

interface NotificationItem {
  id: string;
  type: 'maturity' | 'warning' | 'info';
  title: string;
  message: string;
  investmentId: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
}

const InvestmentNotifications: React.FC<InvestmentNotificationsProps> = ({ investments }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const generateNotifications = () => {
      const newNotifications: NotificationItem[] = [];

      investments.forEach((investment) => {
        if (investment.status !== 'active' || !investment.maturity_date) return;

        const now = new Date();
        const maturityDate = new Date(investment.maturity_date);
        const daysUntilMaturity = InvestmentService.getDaysUntilMaturity(investment.maturity_date);
        const isMatured = InvestmentService.isInvestmentMatured(investment.maturity_date);

        // Maturity notification
        if (isMatured) {
          newNotifications.push({
            id: `maturity-${investment.id}`,
            type: 'maturity',
            title: 'Investment Matured!',
            message: `Your ${investment.plan.plan_name} plan investment has matured. You can now withdraw your funds.`,
            investmentId: investment.id,
            priority: 'high',
            timestamp: maturityDate
          });
        }
        // Warning notifications for upcoming maturity
        else if (daysUntilMaturity <= 7 && daysUntilMaturity > 0) {
          newNotifications.push({
            id: `warning-${investment.id}`,
            type: 'warning',
            title: 'Investment Maturity Soon',
            message: `Your ${investment.plan.plan_name} plan investment will mature in ${daysUntilMaturity} day${daysUntilMaturity > 1 ? 's' : ''}.`,
            investmentId: investment.id,
            priority: 'high',
            timestamp: now
          });
        }
        // Info notifications for progress milestones
        else {
          const progress = InvestmentService.calculateInvestmentProgress(
            investment.start_date,
            investment.maturity_date
          );

          if (progress >= 75 && progress < 100) {
            newNotifications.push({
              id: `progress-${investment.id}`,
              type: 'info',
              title: 'Investment Progress',
              message: `Your ${investment.plan.plan_name} plan investment is ${progress.toFixed(1)}% complete.`,
              investmentId: investment.id,
              priority: 'medium',
              timestamp: now
            });
          }
        }
      });

      // Sort by priority and timestamp
      newNotifications.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

      setNotifications(newNotifications);
    };

    generateNotifications();
    
    // Update notifications every minute
    const interval = setInterval(generateNotifications, 60000);
    
    return () => clearInterval(interval);
  }, [investments]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'maturity':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'maturity':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <span>Investment Notifications</span>
          <Badge variant="secondary" className="ml-auto">
            {notifications.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((notification) => (
          <Alert 
            key={notification.id}
            className={`${getNotificationColor(notification.type)} border`}
          >
            <div className="flex items-start space-x-3">
              {getNotificationIcon(notification.type)}
              <div className="flex-1">
                <AlertDescription>
                  <div className="font-semibold text-gray-900 mb-1">
                    {notification.title}
                  </div>
                  <div className="text-sm text-gray-700">
                    {notification.message}
                  </div>
                  <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {notification.timestamp.toLocaleDateString()} at {notification.timestamp.toLocaleTimeString()}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        notification.priority === 'high' ? 'border-red-300 text-red-700' :
                        notification.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                        'border-gray-300 text-gray-700'
                      }`}
                    >
                      {notification.priority} priority
                    </Badge>
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
};

export default InvestmentNotifications;
