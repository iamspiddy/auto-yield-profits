import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Mail, MessageCircle } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="bg-background text-foreground">
      {/* Final CTA */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Ready to Start Earning?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your crypto deserves to grow. Start with $50 today and join hundreds of users earning passive income.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" className="text-lg px-8 py-6 h-auto">
                Start Earning Now
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto">
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
            <h3 className="text-2xl font-bold text-foreground">Forexcomplex</h3>
            <p className="text-muted-foreground text-sm">
              The trusted platform for passive crypto earnings. Managed by experts, designed for everyone.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Legal</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors block">Terms of Service</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors block">Privacy Policy</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors block">Risk Disclosure</a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Support</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors block">Help Center</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors block">Contact Us</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors block">Status Page</a>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Contact</h4>
            <div className="space-y-3">
              <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
                <Mail className="h-4 w-4" />
                support@forexcomplex.com
              </a>
              <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
                <MessageCircle className="h-4 w-4" />
                Join Telegram
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2025 Forexcomplex. All rights reserved. | Not financial advice. Cryptocurrency investments carry risk.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;