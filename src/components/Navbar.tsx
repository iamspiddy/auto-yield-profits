import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  const openChat = () => {
    // Trigger JivoChat widget
    if (window.jivo_open) {
      window.jivo_open();
    } else {
      // Fallback: scroll to bottom where chat widget should be visible
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  const navLinks = [
    { label: t("navigation.howItWorks", "How It Works"), id: "how-it-works" },
    { label: t("navigation.features", "Features"), id: "features" },
    { label: t("navigation.referrals", "Referrals"), id: "referrals" },
    { label: t("navigation.faq", "FAQ"), id: "faq" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-primary">Forexcomplex</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="text-foreground hover:text-primary px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          {/* CTA Button - Desktop */}
          <div className="hidden md:flex items-center space-x-2">
            <LanguageSwitcher />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openChat}
              className="flex items-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              {t("navigation.chat", "Chat")}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth">{t("navigation.login", "Log In")}</Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link to="/auth">{t("navigation.register", "Get Started")}</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-border">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="text-foreground hover:text-primary block px-3 py-2 text-base font-medium w-full text-left transition-colors duration-200"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-2 space-y-2">
                <div className="px-3 py-2">
                  <LanguageSwitcher />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full flex items-center justify-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white" 
                  onClick={openChat}
                >
                  <MessageCircle className="h-4 w-4" />
                  {t("navigation.chat", "Chat")}
                </Button>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/auth">{t("navigation.login", "Log In")}</Link>
                </Button>
                <Button variant="default" size="sm" className="w-full" asChild>
                  <Link to="/auth">{t("navigation.register", "Get Started")}</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;