import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Percent, TrendingUp } from 'lucide-react';

interface ReferralOverviewProps {
  totalInvites: number;
  totalEarned: number;
  commissionRate: number;
  isLoading?: boolean;
}

const ReferralOverview: React.FC<ReferralOverviewProps> = ({
  totalInvites,
  totalEarned,
  commissionRate,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 bg-slate-700 rounded"></div>
              <div className="h-16 bg-slate-700 rounded"></div>
              <div className="h-16 bg-slate-700 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-white">
          <span className="flex items-center text-xl">
            <Users className="h-6 w-6 mr-3 text-blue-400" />
            Referral Overview
          </span>
          <Badge 
            variant="outline" 
            className="bg-green-500/20 border-green-500/50 text-green-400 px-3 py-1"
          >
            {commissionRate}% Commission
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Invites */}
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-4 rounded-xl border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-blue-400" />
              <TrendingUp className="h-4 w-4 text-blue-300" />
            </div>
            <p className="text-sm text-blue-300 font-medium">Total Invites</p>
            <p className="text-3xl font-bold text-blue-100">{totalInvites}</p>
            <p className="text-xs text-blue-400 mt-1">Active referrals</p>
          </div>

          {/* Total Earned */}
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 p-4 rounded-xl border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              <TrendingUp className="h-4 w-4 text-green-300" />
            </div>
            <p className="text-sm text-green-300 font-medium">Total Earned</p>
            <p className="text-3xl font-bold text-green-100">${totalEarned.toFixed(2)}</p>
            <p className="text-xs text-green-400 mt-1">Lifetime earnings</p>
          </div>

          {/* Commission Rate */}
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-4 rounded-xl border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <Percent className="h-5 w-5 text-purple-400" />
              <TrendingUp className="h-4 w-4 text-purple-300" />
            </div>
            <p className="text-sm text-purple-300 font-medium">Commission Rate</p>
            <p className="text-3xl font-bold text-purple-100">{commissionRate}%</p>
            <p className="text-xs text-purple-400 mt-1">Per referral</p>
          </div>
        </div>

        {/* Encouraging Message for New Users */}
        {totalInvites === 0 && (
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4 rounded-xl border border-amber-500/30">
            <div className="flex items-center mb-2">
              <div className="text-2xl mr-2">🚀</div>
              <h3 className="text-lg font-semibold text-amber-200">Start Your Referral Journey!</h3>
            </div>
            <p className="text-amber-100 text-sm">
              You haven't referred anyone yet. Invite your friends now and earn {commissionRate}% on every deposit they make!
            </p>
          </div>
        )}

        {/* Success Message for Active Users */}
        {totalInvites > 0 && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-xl border border-green-500/30">
            <div className="flex items-center mb-2">
              <div className="text-2xl mr-2">🎉</div>
              <h3 className="text-lg font-semibold text-green-200">Great Job!</h3>
            </div>
            <p className="text-green-100 text-sm">
              You've successfully referred {totalInvites} {totalInvites === 1 ? 'person' : 'people'} and earned ${totalEarned.toFixed(2)} in commissions. Keep it up!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralOverview;
