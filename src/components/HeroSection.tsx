import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Shield, Coins } from "lucide-react";
import heroImage from "@/assets/hero-crypto.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen bg-gradient-hero overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.1)_25%,rgba(68,68,68,.1)_50%,transparent_50%,transparent_75%,rgba(68,68,68,.1)_75%,rgba(68,68,68,.1))] bg-[length:20px_20px] opacity-30"></div>
      
      <div className="container mx-auto px-4 pt-20 pb-12 relative z-10">
        <div className="flex flex-col items-center text-center space-y-12 min-h-[calc(100vh-120px)] justify-center">
          {/* Centered Content */}
          <div className="space-y-8 animate-fade-in max-w-4xl">
            {/* Trust Badge */}
            <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-full px-4 py-2 w-fit mx-auto shadow-card">
              <Shield className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-muted-foreground">100% Transparent & Secure</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-6">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
                Earn Crypto
                <span className="bg-gradient-primary bg-clip-text text-transparent"> Passively</span>
                <br />
                While You Sleep
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                Deposit your crypto, and let our team do the work. Weekly profits, transparent dashboards, and no trading stress.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" className="text-lg px-8 py-6 h-auto">
                Start Earning Now
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto">
                How It Works
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-8 pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <span className="text-sm text-muted-foreground">Weekly Returns</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-success" />
                <span className="text-sm text-muted-foreground">Start with $50</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-success" />
                <span className="text-sm text-muted-foreground">Withdraw Anytime</span>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground pt-4">
              100% passive. Withdraw anytime. Capital at risk.
            </p>
          </div>

          {/* Hero Image/Visual - Centered below content */}
          <div className="relative max-w-2xl mx-auto">
            <div className="relative">
              <img 
                src={heroImage} 
                alt="Crypto earnings platform dashboard" 
                className="rounded-2xl shadow-2xl w-full h-auto"
              />
              
              {/* Floating Cards */}
              <Card className="absolute -top-4 -left-4 p-4 bg-gradient-card shadow-card animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Weekly Profit: +$127</span>
                </div>
              </Card>
              
              <Card className="absolute -bottom-4 -right-4 p-4 bg-gradient-card shadow-card animate-float" style={{animationDelay: '1s'}}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">+18.5%</div>
                  <div className="text-xs text-muted-foreground">Monthly Return</div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;