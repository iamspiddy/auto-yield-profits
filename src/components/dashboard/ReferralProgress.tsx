import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Users, DollarSign, Award } from 'lucide-react';

interface ReferralProgressProps {
  totalInvites: number;
  totalEarned: number;
  commissionRate: number;
  isLoading?: boolean;
}

const ReferralProgress: React.FC<ReferralProgressProps> = ({
  totalInvites,
  totalEarned,
  commissionRate,
  isLoading = false
}) => {
  const badgeLevels = [
    { name: 'Bronze', requirement: 1, emoji: '🥉', color: 'text-amber-600' },
    { name: 'Silver', requirement: 6, emoji: '🥈', color: 'text-slate-400' },
    { name: 'Gold', requirement: 16, emoji: '🥇', color: 'text-yellow-500' },
    { name: 'Diamond', requirement: 50, emoji: '💎', color: 'text-cyan-400' }
  ];

  const getCurrentLevel = () => {
    if (totalInvites >= 50) return badgeLevels[3];
    if (totalInvites >= 16) return badgeLevels[2];
    if (totalInvites >= 6) return badgeLevels[1];
    if (totalInvites >= 1) return badgeLevels[0];
    return null;
  };

  const getNextLevel = () => {
    if (totalInvites < 1) return badgeLevels[0];
    if (totalInvites < 6) return badgeLevels[1];
    if (totalInvites < 16) return badgeLevels[2];
    if (totalInvites < 50) return badgeLevels[3];
    return null; // Max level reached
  };

  const getProgressToNext = () => {
    const nextLevel = getNextLevel();
    if (!nextLevel) return { progress: 100, remaining: 0, current: totalInvites, target: 0 };
    
    const current = totalInvites;
    const target = nextLevel.requirement;
    const progress = Math.min((current / target) * 100, 100);
    const remaining = Math.max(target - current, 0);
    
    return { progress, remaining, current, target };
  };

  const getEarningsProjection = () => {
    const nextLevel = getNextLevel();
    if (!nextLevel) return 0;
    
    const remaining = Math.max(nextLevel.requirement - totalInvites, 0);
    const avgEarningPerReferral = totalInvites > 0 ? totalEarned / totalInvites : 0;
    return remaining * avgEarningPerReferral;
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="h-3 bg-slate-700 rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-slate-700 rounded"></div>
              <div className="h-16 bg-slate-700 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentLevel = getCurrentLevel();
  const nextLevel = getNextLevel();
  const { progress, remaining, current, target } = getProgressToNext();
  const earningsProjection = getEarningsProjection();

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-white text-xl">
          <Target className="h-6 w-6 mr-3 text-blue-400" />
          Progress Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Level Display */}
        {currentLevel && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-xl border border-green-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{currentLevel.emoji}</div>
                <div>
                  <h3 className={`text-lg font-semibold ${currentLevel.color}`}>
                    {currentLevel.name} Referrer
                  </h3>
                  <p className="text-green-100 text-sm">Achievement unlocked!</p>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className="border-green-500/50 text-green-400 bg-transparent"
              >
                <Award className="h-3 w-3 mr-1" />
                Achieved
              </Badge>
            </div>
          </div>
        )}

        {/* Progress to Next Level */}
        {nextLevel && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-200">
                Progress to {nextLevel.name} Referrer
              </h3>
              <Badge 
                variant="outline" 
                className="border-blue-500/50 text-blue-400 bg-transparent"
              >
                {remaining} more needed
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm text-slate-300">
                <span>{current} / {target} referrals</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress 
                value={progress} 
                className="h-3 bg-slate-700"
              />
            </div>

            {/* Stats for Next Level */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-slate-300">Referrals Needed</span>
                </div>
                <p className="text-2xl font-bold text-blue-100">{remaining}</p>
                <p className="text-xs text-slate-400">to reach {nextLevel.name}</p>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-slate-300">Potential Earnings</span>
                </div>
                <p className="text-2xl font-bold text-green-100">
                  ${earningsProjection.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">estimated from {remaining} referrals</p>
              </div>
            </div>
          </div>
        )}

        {/* Max Level Reached */}
        {!nextLevel && currentLevel && (
          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 p-4 rounded-xl border border-cyan-500/30">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🏆</div>
              <div>
                <h3 className="text-lg font-semibold text-cyan-200">
                  Max Level Achieved!
                </h3>
                <p className="text-cyan-100 text-sm">
                  You've reached the highest referral level. Amazing work!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Encouragement for New Users */}
        {!currentLevel && (
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4 rounded-xl border border-amber-500/30">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🚀</div>
              <div>
                <h3 className="text-lg font-semibold text-amber-200">
                  Start Your Journey!
                </h3>
                <p className="text-amber-100 text-sm">
                  Make your first referral to unlock the Bronze Referrer badge and start earning {commissionRate}% commissions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-100">{totalInvites}</p>
            <p className="text-xs text-slate-400">Total Referrals</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-100">${totalEarned.toFixed(2)}</p>
            <p className="text-xs text-slate-400">Total Earned</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralProgress;
