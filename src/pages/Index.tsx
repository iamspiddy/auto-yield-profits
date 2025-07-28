import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesSection from "@/components/FeaturesSection";
import ReferralSection from "@/components/ReferralSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import FooterSection from "@/components/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ReferralSection />
      <TestimonialsSection />
      <FAQSection />
      <FooterSection />
    </div>
  );
};

export default Index;
