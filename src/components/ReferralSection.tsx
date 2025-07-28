import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Share2, DollarSign, TrendingUp } from "lucide-react";

const ReferralSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Earn Even More with Referrals
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Share your invite link and earn 2% of every deposit made by your referrals. 
              Your crypto earns, and your network pays you too.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Referral Benefits */}
            <div className="space-y-6">
              <Card className="bg-gradient-card shadow-card border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-foreground">
                    <Users className="h-6 w-6 text-primary" />
                    How Referrals Work
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">1</div>
                    <div>
                      <p className="font-medium text-foreground">Share Your Link</p>
                      <p className="text-sm text-muted-foreground">Get your unique referral link from your dashboard</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">2</div>
                    <div>
                      <p className="font-medium text-foreground">Friends Deposit</p>
                      <p className="text-sm text-muted-foreground">Your referrals sign up and make their first deposit</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success text-success-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">3</div>
                    <div>
                      <p className="font-medium text-foreground">You Earn 2%</p>
                      <p className="text-sm text-muted-foreground">Instant commission on every deposit they make</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-gradient-success/10 border-success/20 border-2">
                  <CardContent className="p-6 text-center">
                    <DollarSign className="h-8 w-8 text-success mx-auto mb-2" />
                    <div className="text-2xl font-bold text-success">2%</div>
                    <p className="text-sm text-muted-foreground">Commission Rate</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-primary/10 border-primary/20 border-2">
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold text-primary">Weekly</div>
                    <p className="text-sm text-muted-foreground">Payout Schedule</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right - CTA */}
            <div className="space-y-6">
              <Card className="bg-gradient-primary text-primary-foreground border-0 shadow-primary">
                <CardContent className="p-8 text-center space-y-6">
                  <Share2 className="h-12 w-12 mx-auto" />
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Ready to Share?</h3>
                    <p className="opacity-90">
                      Start earning commissions from your network today
                    </p>
                  </div>
                  <Button variant="premium" size="lg" className="w-full">
                    Get Your Referral Link
                  </Button>
                </CardContent>
              </Card>

              {/* Example Earnings */}
              <Card className="bg-gradient-card shadow-card border-0">
                <CardHeader>
                  <CardTitle className="text-center text-foreground">Example Earnings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">Friend deposits $1,000</span>
                    <span className="font-semibold text-success">You earn $20</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">Friend deposits $5,000</span>
                    <span className="font-semibold text-success">You earn $100</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">5 friends × $2,000 each</span>
                    <span className="font-semibold text-success">You earn $200</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReferralSection;