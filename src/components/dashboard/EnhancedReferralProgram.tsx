import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, Target, Image, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getProductionUrl } from '@/lib/utils';
import ReferralOverview from './ReferralOverview';
import ReferralLinkBox from './ReferralLinkBox';
import ReferralBadges from './ReferralBadges';
import ReferralProgress from './ReferralProgress';
import ReferralLeaderboard from './ReferralLeaderboard';
import ReferralBanners from './ReferralBanners';
import ConfettiAnimation from './ConfettiAnimation';

interface ReferralData {
  referralCode: string;
  totalInvites: number;
  totalEarned: number;
  commissionRate: number;
}

const EnhancedReferralProgram = () => {
  const [referralData, setReferralData] = useState<ReferralData>({
    referralCode: '',
    totalInvites: 0,
    totalEarned: 0,
    commissionRate: 5
  });
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [previousInvites, setPreviousInvites] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchReferralData = async () => {
      try {
        // Fetch user profile for referral code
        const { data: profile } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('user_id', user.id)
          .single();

        // Fetch referral statistics
        const { data: referrals } = await supabase
          .from('referrals')
          .select('total_earned, commission_rate')
          .eq('referrer_id', user.id);

        const totalInvites = referrals?.length || 0;
        const totalEarned = referrals?.reduce((sum, ref) => sum + Number(ref.total_earned), 0) || 0;
        const avgCommissionRate = referrals?.[0]?.commission_rate || 0.05;

        const newData = {
          referralCode: profile?.referral_code || '',
          totalInvites,
          totalEarned,
          commissionRate: avgCommissionRate * 100
        };

        // Check if user gained new referrals (for confetti)
        if (totalInvites > previousInvites && previousInvites > 0) {
          setShowConfetti(true);
        }

        setReferralData(newData);
        setPreviousInvites(totalInvites);
      } catch (error) {
        console.error('Error fetching referral data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferralData();
    
    // Listen for manual refresh events
    const handleRefresh = () => {
      fetchReferralData();
    };

    window.addEventListener('dashboard-refresh', handleRefresh);

    return () => {
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [user, previousInvites]);

  const referralLink = `${getProductionUrl()}/auth?ref=${referralData.referralCode}`;

  const handleConfettiComplete = () => {
    setShowConfetti(false);
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="h-32 bg-slate-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ConfettiAnimation 
        trigger={showConfetti} 
        onComplete={handleConfettiComplete}
      />
      
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-white">
            <span className="flex items-center text-2xl">
              <Users className="h-7 w-7 mr-3 text-blue-400" />
              Referral Program
            </span>
            <Badge 
              variant="outline" 
              className="bg-green-500/20 border-green-500/50 text-green-400 px-4 py-2 text-sm"
            >
              {referralData.commissionRate}% Commission
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 border-b border-slate-700">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="share" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
              >
                <Users className="h-4 w-4 mr-2" />
                Share
              </TabsTrigger>
              <TabsTrigger 
                value="badges" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Badges
              </TabsTrigger>
              <TabsTrigger 
                value="progress" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
              >
                <Target className="h-4 w-4 mr-2" />
                Progress
              </TabsTrigger>
              <TabsTrigger 
                value="banners" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
              >
                <Image className="h-4 w-4 mr-2" />
                Banners
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="p-6 space-y-6">
              <ReferralOverview
                totalInvites={referralData.totalInvites}
                totalEarned={referralData.totalEarned}
                commissionRate={referralData.commissionRate}
                isLoading={loading}
              />
              <ReferralLeaderboard 
                timeRange="month" 
                maxEntries={5}
              />
            </TabsContent>

            <TabsContent value="share" className="p-6">
              <ReferralLinkBox
                referralLink={referralLink}
                referralCode={referralData.referralCode}
                commissionRate={referralData.commissionRate}
              />
            </TabsContent>

            <TabsContent value="badges" className="p-6">
              <ReferralBadges
                totalInvites={referralData.totalInvites}
                totalEarned={referralData.totalEarned}
                isLoading={loading}
              />
            </TabsContent>

            <TabsContent value="progress" className="p-6">
              <ReferralProgress
                totalInvites={referralData.totalInvites}
                totalEarned={referralData.totalEarned}
                commissionRate={referralData.commissionRate}
                isLoading={loading}
              />
            </TabsContent>

            <TabsContent value="banners" className="p-6">
              <ReferralBanners
                referralCode={referralData.referralCode}
                referralLink={referralLink}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
};

export default EnhancedReferralProgram;
