import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Award, Star, Crown, Target } from 'lucide-react';

interface ReferralBadgesProps {
  totalInvites: number;
  totalEarned: number;
  isLoading?: boolean;
}

interface BadgeInfo {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requirement: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const ReferralBadges: React.FC<ReferralBadgesProps> = ({
  totalInvites,
  totalEarned,
  isLoading = false
}) => {
  const badges: BadgeInfo[] = [
    {
      id: 'bronze',
      name: 'Bronze Referrer',
      emoji: '🥉',
      description: '1-5 successful referrals',
      requirement: 1,
      color: 'text-amber-600',
      bgColor: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10',
      borderColor: 'border-amber-500/50',
      icon: <Trophy className="h-5 w-5 text-amber-500" />
    },
    {
      id: 'silver',
      name: 'Silver Referrer',
      emoji: '🥈',
      description: '6-15 successful referrals',
      requirement: 6,
      color: 'text-slate-400',
      bgColor: 'bg-gradient-to-br from-slate-500/20 to-slate-600/10',
      borderColor: 'border-slate-500/50',
      icon: <Award className="h-5 w-5 text-slate-400" />
    },
    {
      id: 'gold',
      name: 'Gold Referrer',
      emoji: '🥇',
      description: '16-50 successful referrals',
      requirement: 16,
      color: 'text-yellow-500',
      bgColor: 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10',
      borderColor: 'border-yellow-500/50',
      icon: <Star className="h-5 w-5 text-yellow-500" />
    },
    {
      id: 'diamond',
      name: 'Diamond Referrer',
      emoji: '💎',
      description: '50+ successful referrals',
      requirement: 50,
      color: 'text-cyan-400',
      bgColor: 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10',
      borderColor: 'border-cyan-500/50',
      icon: <Crown className="h-5 w-5 text-cyan-400" />
    }
  ];

  const getCurrentBadge = () => {
    if (totalInvites >= 50) return badges[3]; // Diamond
    if (totalInvites >= 16) return badges[2]; // Gold
    if (totalInvites >= 6) return badges[1]; // Silver
    if (totalInvites >= 1) return badges[0]; // Bronze
    return null;
  };

  const getNextBadge = () => {
    if (totalInvites < 1) return badges[0]; // Bronze
    if (totalInvites < 6) return badges[1]; // Silver
    if (totalInvites < 16) return badges[2]; // Gold
    if (totalInvites < 50) return badges[3]; // Diamond
    return null; // Max level reached
  };

  const getProgressToNext = () => {
    const nextBadge = getNextBadge();
    if (!nextBadge) return { progress: 100, remaining: 0 };
    
    const currentLevel = totalInvites;
    const nextLevel = nextBadge.requirement;
    const progress = Math.min((currentLevel / nextLevel) * 100, 100);
    const remaining = Math.max(nextLevel - currentLevel, 0);
    
    return { progress, remaining };
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-slate-700 rounded"></div>
              <div className="h-20 bg-slate-700 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentBadge = getCurrentBadge();
  const nextBadge = getNextBadge();
  const { progress, remaining } = getProgressToNext();

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-white text-xl">
          <Trophy className="h-6 w-6 mr-3 text-yellow-400" />
          Referral Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Badge */}
        {currentBadge && (
          <div className={`${currentBadge.bgColor} p-4 rounded-xl border ${currentBadge.borderColor}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{currentBadge.emoji}</div>
                <div>
                  <h3 className={`text-lg font-semibold ${currentBadge.color}`}>
                    {currentBadge.name}
                  </h3>
                  <p className="text-slate-300 text-sm">{currentBadge.description}</p>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={`${currentBadge.borderColor} ${currentBadge.color} bg-transparent`}
              >
                <Target className="h-3 w-3 mr-1" />
                Achieved
              </Badge>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              {currentBadge.icon}
              <span className="text-sm">You've earned this badge! 🎉</span>
            </div>
          </div>
        )}

        {/* Progress to Next Badge */}
        {nextBadge && (
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 rounded-xl border border-blue-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="text-2xl opacity-50">{nextBadge.emoji}</div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-200">
                    Next: {nextBadge.name}
                  </h3>
                  <p className="text-blue-100 text-sm">{nextBadge.description}</p>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className="border-blue-500/50 text-blue-400 bg-transparent"
              >
                {remaining} more to go
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-blue-200">
                <span>Progress to {nextBadge.name}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress 
                value={progress} 
                className="h-2 bg-slate-700"
              />
              <p className="text-xs text-blue-300">
                {remaining > 0 
                  ? `${remaining} more ${remaining === 1 ? 'referral' : 'referrals'} needed`
                  : 'You\'re ready for the next level!'
                }
              </p>
            </div>
          </div>
        )}

        {/* All Badges Overview */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-300">All Achievement Levels</h4>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => {
              const isEarned = totalInvites >= badge.requirement;
              const isCurrent = currentBadge?.id === badge.id;
              
              return (
                <div
                  key={badge.id}
                  className={`${badge.bgColor} p-3 rounded-lg border ${badge.borderColor} ${
                    isEarned ? 'opacity-100' : 'opacity-50'
                  } ${isCurrent ? 'ring-2 ring-blue-400' : ''}`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="text-xl">{badge.emoji}</div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${badge.color}`}>
                        {badge.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {badge.requirement}+ referrals
                      </p>
                    </div>
                    {isEarned && (
                      <div className="text-green-400">
                        <Trophy className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Encouragement Message */}
        {totalInvites === 0 && (
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4 rounded-xl border border-amber-500/30">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">🎯</div>
              <div>
                <h3 className="text-lg font-semibold text-amber-200">
                  Start Your Journey!
                </h3>
                <p className="text-amber-100 text-sm">
                  Make your first referral to unlock the Bronze Referrer badge
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralBadges;
