import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BalanceOverview from '@/components/dashboard/BalanceOverview';
import DepositPanel from '@/components/dashboard/DepositPanel';
import EarningsOverview from '@/components/dashboard/EarningsOverview';
import WithdrawalPanel from '@/components/dashboard/WithdrawalPanel';
import TransactionHistory from '@/components/dashboard/TransactionHistory';
import ReferralProgram from '@/components/dashboard/ReferralProgram';

const Dashboard = () => {
  const { user, loading } = useAuth();

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
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <BalanceOverview />
            <EarningsOverview />
            <TransactionHistory />
          </div>
          
          <div className="space-y-6">
            <DepositPanel />
            <WithdrawalPanel />
            <ReferralProgram />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;