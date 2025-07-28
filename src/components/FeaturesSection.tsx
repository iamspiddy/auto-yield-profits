import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Shield, BarChart3, Rocket, FileText, Users } from "lucide-react";

const features = [
  {
    icon: DollarSign,
    title: "Passive Crypto Income",
    description: "Earn while you sleep. No trading knowledge or daily management required.",
    color: "text-success"
  },
  {
    icon: Shield,
    title: "Transparent Process",
    description: "Admin-managed with full transaction history and real-time balance updates.",
    color: "text-primary"
  },
  {
    icon: BarChart3,
    title: "Real-time Dashboard",
    description: "Track your earnings, balance, and transaction history with live updates.",
    color: "text-success"
  },
  {
    icon: Rocket,
    title: "Start Small, Scale Fast",
    description: "Begin with just $50 and scale your investment as you see results.",
    color: "text-primary"
  },
  {
    icon: FileText,
    title: "Full Transaction History",
    description: "Complete audit trail of all deposits, withdrawals, and profit distributions.",
    color: "text-success"
  },
  {
    icon: Users,
    title: "Referral Bonuses",
    description: "Earn 2% commission on every deposit made by your referred users.",
    color: "text-primary"
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Why Choose AutoYield?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The easiest way to earn passive income from your crypto assets
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-gradient-card shadow-card hover:shadow-primary transition-all duration-300 group hover:-translate-y-2 border-0">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-muted rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl font-semibold text-foreground">
                    {feature.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Trust Indicators */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="text-3xl font-bold text-success">24-48h</div>
            <p className="text-muted-foreground">Withdrawal Processing</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">$50</div>
            <p className="text-muted-foreground">Minimum Deposit</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-success">100%</div>
            <p className="text-muted-foreground">Transparent Operations</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;