import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Mail, MessageCircle } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="bg-foreground text-background">
      {/* Legal Disclaimer */}
      <div className="border-b border-background/20">
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-destructive/10 border-destructive/20 border-2">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <Shield className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-destructive">Legal Disclaimer</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We are not a licensed financial advisor or investment institution. Past returns do not guarantee future results. 
                    Capital is at risk. Cryptocurrency investments are volatile and may result in loss of principal. 
                    Please do your own research and only invest what you can afford to lose.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Final CTA */}
      <div className="border-b border-background/20">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-background">
              Ready to Start Earning?
            </h2>
            <p className="text-xl text-background/80 max-w-2xl mx-auto">
              Your crypto deserves to grow. Start with $50 today and join hundreds of users earning passive income.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" className="text-lg px-8 py-6 h-auto">
                Start Earning Now
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto bg-background/10 border-background/30 text-background hover:bg-background hover:text-foreground">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-background">AutoYield</h3>
            <p className="text-background/70 text-sm">
              The trusted platform for passive crypto earnings. Managed by experts, designed for everyone.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-background">Legal</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="text-background/70 hover:text-background transition-colors block">Terms of Service</a>
              <a href="#" className="text-background/70 hover:text-background transition-colors block">Privacy Policy</a>
              <a href="#" className="text-background/70 hover:text-background transition-colors block">Risk Disclosure</a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-background">Support</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="text-background/70 hover:text-background transition-colors block">Help Center</a>
              <a href="#" className="text-background/70 hover:text-background transition-colors block">Contact Us</a>
              <a href="#" className="text-background/70 hover:text-background transition-colors block">Status Page</a>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-background">Get in Touch</h4>
            <div className="space-y-3">
              <a href="#" className="flex items-center gap-2 text-background/70 hover:text-background transition-colors text-sm">
                <Mail className="h-4 w-4" />
                support@autoyield.com
              </a>
              <a href="#" className="flex items-center gap-2 text-background/70 hover:text-background transition-colors text-sm">
                <MessageCircle className="h-4 w-4" />
                Join Telegram
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 mt-8 pt-8 text-center">
          <p className="text-background/70 text-sm">
            © 2024 AutoYield. All rights reserved. | Not financial advice. Cryptocurrency investments carry risk.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;