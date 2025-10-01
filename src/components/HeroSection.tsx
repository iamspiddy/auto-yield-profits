import { Button } from "@/components/ui/button";
import { TrendingUp, Shield, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import bannerImage from "@/assets/banner.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bannerImage})` }}
      ></div>
      <div className="absolute inset-0 bg-black/50"></div>
      
      <div className="container mx-auto px-4 pt-32 pb-12 relative z-10">
        <div className="flex flex-col items-center text-center space-y-12 min-h-[calc(100vh-144px)] justify-center">
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
              <Button variant="hero" size="lg" className="text-lg px-8 py-6 h-auto" asChild>
                <Link to="/auth">Start Earning Now</Link>
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

        </div>
      </div>
    </section>
  );
};

export default HeroSection;