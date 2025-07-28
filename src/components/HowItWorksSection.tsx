import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Users, TrendingUp, Download } from "lucide-react";

const steps = [
  {
    icon: Wallet,
    title: "Deposit Crypto",
    description: "Start with USDT, BTC, or ETH. Minimum deposit is just $50.",
    color: "text-primary"
  },
  {
    icon: Users,
    title: "Expert Management",
    description: "Our team deploys funds into proven earning strategies and manages everything.",
    color: "text-success"
  },
  {
    icon: TrendingUp,
    title: "Earn Profits",
    description: "Receive passive profits weekly or monthly directly to your dashboard.",
    color: "text-primary"
  },
  {
    icon: Download,
    title: "Withdraw Anytime",
    description: "Access your funds 24/7. Withdrawals processed within 24-48 hours.",
    color: "text-success"
  }
];

const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to start earning passive crypto income
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {steps.map((step, index) => (
            <Card key={index} className="relative bg-gradient-card shadow-card hover:shadow-primary transition-all duration-300 group hover:-translate-y-2">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-muted rounded-full w-fit group-hover:scale-110 transition-transform duration-300">
                  <step.icon className={`h-8 w-8 ${step.color}`} />
                </div>
                <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <h3 className="text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Card className="inline-block p-6 bg-gradient-card shadow-card">
            <div className="flex items-center gap-4 text-center">
              <TrendingUp className="h-6 w-6 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Bonus Feature</p>
                <p className="font-semibold text-foreground">Optional auto-reinvest to compound your profits</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;