import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Share2, Copy, Image, Palette } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ReferralBannersProps {
  referralCode: string;
  referralLink: string;
}

interface BannerTemplate {
  id: string;
  name: string;
  description: string;
  gradient: string;
  textColor: string;
  emoji: string;
}

const ReferralBanners: React.FC<ReferralBannersProps> = ({
  referralCode,
  referralLink
}) => {
  const [selectedBanner, setSelectedBanner] = useState<string>('modern');
  const [isGenerating, setIsGenerating] = useState(false);

  const bannerTemplates: BannerTemplate[] = [
    {
      id: 'modern',
      name: 'Modern Crypto',
      description: 'Clean, professional design',
      gradient: 'from-blue-600 to-purple-600',
      textColor: 'text-white',
      emoji: '💎'
    },
    {
      id: 'gold',
      name: 'Golden Success',
      description: 'Premium, luxury feel',
      gradient: 'from-yellow-500 to-amber-600',
      textColor: 'text-white',
      emoji: '🏆'
    },
    {
      id: 'green',
      name: 'Growth Focus',
      description: 'Money and growth theme',
      gradient: 'from-green-500 to-emerald-600',
      textColor: 'text-white',
      emoji: '💰'
    },
    {
      id: 'dark',
      name: 'Dark Mode',
      description: 'Sleek, modern dark theme',
      gradient: 'from-slate-800 to-slate-900',
      textColor: 'text-white',
      emoji: '🚀'
    }
  ];

  const generateBanner = async (template: BannerTemplate) => {
    setIsGenerating(true);
    
    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Set canvas size
      canvas.width = 800;
      canvas.height = 400;

      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const colors = template.gradient.split(' ')[1] === 'to' 
        ? template.gradient.split(' ').slice(1)
        : [template.gradient];
      
      // Apply gradient (simplified for demo)
      ctx.fillStyle = '#1e293b'; // Default dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add text
      ctx.fillStyle = template.textColor === 'text-white' ? '#ffffff' : '#000000';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ForexComplex', canvas.width / 2, 120);
      
      ctx.font = '24px Arial';
      ctx.fillText('Earn Crypto While You Sleep', canvas.width / 2, 160);
      
      ctx.font = 'bold 32px Arial';
      ctx.fillText(`Code: ${referralCode}`, canvas.width / 2, 220);
      
      ctx.font = '18px Arial';
      ctx.fillText('Join now and start earning!', canvas.width / 2, 260);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `forexcomplex-banner-${template.id}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');

      toast({
        title: "Banner Generated! 🎨",
        description: `Your ${template.name} banner has been downloaded.`,
      });

    } catch (error) {
      console.error('Error generating banner:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate banner. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyBannerText = () => {
    const bannerText = `🚀 Join ForexComplex and start earning crypto!\n\n💰 Use my referral code: ${referralCode}\n\n🔗 ${referralLink}\n\n#ForexComplex #Crypto #EarnMoney`;
    
    navigator.clipboard.writeText(bannerText).then(() => {
      toast({
        title: "Text Copied! 📝",
        description: "Banner text has been copied to clipboard.",
      });
    });
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-white text-xl">
          <Image className="h-6 w-6 mr-3 text-purple-400" />
          Referral Banners
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Banner Templates */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-200">Choose a Design</h3>
          <div className="grid grid-cols-2 gap-3">
            {bannerTemplates.map((template) => (
              <div
                key={template.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedBanner === template.id
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
                }`}
                onClick={() => setSelectedBanner(template.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{template.emoji}</div>
                  <div>
                    <h4 className="font-medium text-slate-200">{template.name}</h4>
                    <p className="text-xs text-slate-400">{template.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-200">Preview</h3>
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <div className={`bg-gradient-to-r ${bannerTemplates.find(t => t.id === selectedBanner)?.gradient} p-6 rounded-lg text-center`}>
              <div className="text-3xl mb-2">
                {bannerTemplates.find(t => t.id === selectedBanner)?.emoji}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">ForexComplex</h2>
              <p className="text-white/90 mb-3">Earn Crypto While You Sleep</p>
              <div className="bg-white/20 px-4 py-2 rounded-lg inline-block">
                <p className="text-white font-bold">Code: {referralCode}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <Button
              onClick={() => generateBanner(bannerTemplates.find(t => t.id === selectedBanner)!)}
              disabled={isGenerating}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Banner
                </>
              )}
            </Button>
            
            <Button
              onClick={copyBannerText}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Text
            </Button>
          </div>

          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 rounded-xl border border-blue-500/30">
            <div className="flex items-center space-x-2 mb-2">
              <Palette className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-blue-200">Pro Tip</h3>
            </div>
            <p className="text-blue-100 text-sm">
              Use these banners on social media, in messages, or anywhere you want to share your referral link. 
              They're designed to grab attention and encourage sign-ups!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralBanners;
