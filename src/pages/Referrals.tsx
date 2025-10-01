import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EnhancedReferralProgram from '@/components/dashboard/EnhancedReferralProgram';

const Referrals = () => {
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
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Referral Program
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Invite your friends and earn 5% commission on every deposit they make. 
            No limits, instant payouts, and exclusive rewards await!
          </p>
        </div>

        {/* Enhanced Referral Program */}
        <EnhancedReferralProgram />
      </div>
    </DashboardLayout>
  );
};

export default Referrals;