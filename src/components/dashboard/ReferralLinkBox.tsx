import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  Check, 
  Share2, 
  MessageCircle, 
  Twitter, 
  Send,
  ExternalLink,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReferralLinkBoxProps {
  referralLink: string;
  referralCode: string;
  commissionRate: number;
}

const ReferralLinkBox: React.FC<ReferralLinkBoxProps> = ({
  referralLink,
  referralCode,
  commissionRate
}) => {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: "Link Copied! 🎉",
        description: "Referral link has been copied to clipboard.",
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

  const handleShare = async (platform?: string) => {
    setIsSharing(true);
    
    const shareText = `Join me on ForexComplex and start earning crypto! Use my referral code: ${referralCode}`;
    const shareUrl = referralLink;

    try {
      if (platform === 'whatsapp') {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        window.open(whatsappUrl, '_blank');
      } else if (platform === 'twitter') {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank');
      } else if (platform === 'telegram') {
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        window.open(telegramUrl, '_blank');
      } else if (navigator.share) {
        await navigator.share({
          title: 'Join ForexComplex - Earn Crypto While You Sleep',
          text: shareText,
          url: shareUrl
        });
      } else {
        // Fallback to copy
        handleCopyLink();
      }
      
      toast({
        title: "Shared Successfully! 🚀",
        description: `Your referral link has been shared via ${platform || 'native share'}.`,
      });
    } catch (error) {
      console.error('Share failed:', error);
      toast({
        title: "Share Failed",
        description: "Failed to share. Please try copying the link instead.",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-white">
          <span className="flex items-center text-xl">
            <Share2 className="h-6 w-6 mr-3 text-blue-400" />
            Your Referral Link
          </span>
          <Badge 
            variant="outline" 
            className="bg-blue-500/20 border-blue-500/50 text-blue-400 px-3 py-1"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Share & Earn
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Link Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-300">Your Referral Link</label>
          <div className="flex space-x-2">
            <Input
              value={referralLink}
              readOnly
              className="flex-1 bg-slate-800/50 border-slate-600 text-slate-200 text-sm font-mono"
            />
            <Button
              onClick={handleCopyLink}
              disabled={copied}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-300">Share Your Link</label>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleShare()}
              disabled={isSharing}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {isSharing ? 'Sharing...' : 'Share'}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Social
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-800 border-slate-700">
                <DropdownMenuItem 
                  onClick={() => handleShare('whatsapp')}
                  className="text-green-400 hover:bg-slate-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleShare('twitter')}
                  className="text-blue-400 hover:bg-slate-700"
                >
                  <Twitter className="h-4 w-4 mr-2" />
                  Twitter
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleShare('telegram')}
                  className="text-blue-300 hover:bg-slate-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Telegram
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Info Tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2 text-slate-400 text-sm cursor-help">
                <Info className="h-4 w-4" />
                <span>How does this work?</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200 max-w-xs">
              <p className="text-sm">
                Earn {commissionRate}% commission on your friends' deposits. No limit on referrals! 
                Share your link and start earning instantly.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 rounded-xl border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-200 mb-1">
                Copy Your Link & Start Earning
              </h3>
              <p className="text-blue-100 text-sm">
                Every friend you refer earns you {commissionRate}% commission on their deposits
              </p>
            </div>
            <Button
              onClick={handleCopyLink}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralLinkBox;
