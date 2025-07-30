import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Copy, Share2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReferralData {
  referralCode: string;
  totalInvites: number;
  totalEarned: number;
  commissionRate: number;
}

const ReferralProgram = () => {
  const [referralData, setReferralData] = useState<ReferralData>({
    referralCode: '',
    totalInvites: 0,
    totalEarned: 0,
    commissionRate: 5
  });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
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

        setReferralData({
          referralCode: profile?.referral_code || '',
          totalInvites,
          totalEarned,
          commissionRate: avgCommissionRate * 100
        });
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
  }, [user]);

  const referralLink = `${window.location.origin}/auth?ref=${referralData.referralCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "Referral link has been copied to clipboard."
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link. Please copy manually.",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join AutoYield - Earn Crypto While You Sleep',
          text: `Use my referral code ${referralData.referralCode} to start earning crypto with AutoYield!`,
          url: referralLink
        });
      } catch (error) {
        // Fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Referral Program
          </span>
          <Badge variant="outline">{referralData.commissionRate}% Commission</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Referral Link</label>
          <div className="flex space-x-2">
            <div className="flex-1 bg-muted p-2 rounded text-xs break-all">
              {referralLink}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Invites</p>
            <p className="text-xl font-bold text-blue-600">{referralData.totalInvites}</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Earned</p>
            <p className="text-xl font-bold text-green-600">${referralData.totalEarned.toFixed(2)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleCopyLink} className="w-full">
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          
          <Button onClick={handleShare} className="w-full">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Info */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            • Earn {referralData.commissionRate}% commission on friends' deposits<br/>
            • No limit on referrals<br/>
            • Commissions paid instantly
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralProgram;