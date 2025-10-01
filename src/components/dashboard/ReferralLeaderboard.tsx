import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Crown, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
  id: string;
  username: string;
  totalInvites: number;
  totalEarned: number;
  rank: number;
  isCurrentUser: boolean;
}

interface ReferralLeaderboardProps {
  timeRange?: 'week' | 'month' | 'all';
  maxEntries?: number;
}

const ReferralLeaderboard: React.FC<ReferralLeaderboardProps> = ({
  timeRange = 'month',
  maxEntries = 5
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        
        // Calculate date range
        const now = new Date();
        let startDate: Date;
        
        switch (timeRange) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0); // All time
        }

        // Fetch referral data with user profiles
        const { data: referrals, error } = await supabase
          .from('referrals')
          .select(`
            referrer_id,
            total_earned,
            created_at
          `)
          .gte('created_at', startDate.toISOString());

        if (error) {
          console.error('Error fetching leaderboard:', error);
          return;
        }

        // Aggregate data by referrer
        const referrerStats = new Map<string, { invites: number; earned: number; username: string; fullName: string }>();
        
        referrals?.forEach((ref: any) => {
          const referrerId = ref.referrer_id;
          const existing = referrerStats.get(referrerId) || { invites: 0, earned: 0, username: '', fullName: '' };
          
          referrerStats.set(referrerId, {
            invites: existing.invites + 1,
            earned: existing.earned + (Number(ref.total_earned) || 0),
            username: 'User', // We'll fetch usernames separately if needed
            fullName: 'User'
          });
        });

        // Fetch usernames for referrers
        const referrerIds = Array.from(referrerStats.keys());
        if (referrerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username, full_name')
            .in('user_id', referrerIds);

          // Update usernames
          profiles?.forEach((profile: any) => {
            const stats = referrerStats.get(profile.user_id);
            if (stats) {
              referrerStats.set(profile.user_id, {
                ...stats,
                username: profile.username || 'Anonymous',
                fullName: profile.full_name || 'User'
              });
            }
          });
        }

        // Convert to array and sort
        const leaderboardData = Array.from(referrerStats.entries())
          .map(([referrerId, stats], index) => ({
            id: referrerId,
            username: stats.username || 'Anonymous',
            totalInvites: stats.invites,
            totalEarned: stats.earned,
            rank: index + 1,
            isCurrentUser: referrerId === user.id
          }))
          .sort((a, b) => b.totalInvites - a.totalInvites)
          .slice(0, maxEntries);

        setLeaderboard(leaderboardData);

        // Find current user's rank
        const allReferrers = Array.from(referrerStats.entries())
          .map(([referrerId, stats]) => ({
            id: referrerId,
            invites: stats.invites,
            earned: stats.earned
          }))
          .sort((a, b) => b.invites - a.invites);

        const userRank = allReferrers.findIndex(ref => ref.id === user.id) + 1;
        setCurrentUserRank(userRank > 0 ? userRank : null);

      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user, timeRange, maxEntries]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-slate-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <Trophy className="h-4 w-4 text-slate-500" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-500';
      case 2:
        return 'text-slate-400';
      case 3:
        return 'text-amber-600';
      default:
        return 'text-slate-500';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-white text-xl">
          <span className="flex items-center">
            <Trophy className="h-6 w-6 mr-3 text-yellow-400" />
            Top Referrers
          </span>
          <Badge 
            variant="outline" 
            className="bg-yellow-500/20 border-yellow-500/50 text-yellow-400 px-3 py-1"
          >
            {timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : 'All Time'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No Referrals Yet</h3>
            <p className="text-slate-400 text-sm">
              Be the first to start referring and climb the leaderboard!
            </p>
          </div>
        ) : (
          <>
            {/* Leaderboard Entries */}
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    entry.isCurrentUser 
                      ? 'bg-blue-500/20 border border-blue-500/50' 
                      : 'bg-slate-800/50 border border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getRankIcon(entry.rank)}
                      <span className={`font-bold ${getRankColor(entry.rank)}`}>
                        #{entry.rank}
                      </span>
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                        {entry.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {entry.username}
                        {entry.isCurrentUser && (
                          <Badge variant="outline" className="ml-2 text-xs bg-blue-500/20 border-blue-500/50 text-blue-400">
                            You
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">
                      {entry.totalInvites} invites
                    </p>
                    <p className="text-xs text-slate-400">
                      ${entry.totalEarned.toFixed(2)} earned
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Current User Rank (if not in top list) */}
            {currentUserRank && currentUserRank > maxEntries && (
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 rounded-xl border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Trophy className="h-5 w-5 text-blue-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-200">Your Rank</h3>
                      <p className="text-xs text-blue-300">#{currentUserRank} overall</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="border-blue-500/50 text-blue-400 bg-transparent"
                  >
                    Keep Going!
                  </Badge>
                </div>
              </div>
            )}

            {/* Time Range Selector */}
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => window.location.reload()} // In a real app, you'd update state
                className={`px-3 py-1 text-xs rounded ${
                  timeRange === 'week' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => window.location.reload()}
                className={`px-3 py-1 text-xs rounded ${
                  timeRange === 'month' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => window.location.reload()}
                className={`px-3 py-1 text-xs rounded ${
                  timeRange === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                All Time
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralLeaderboard;
