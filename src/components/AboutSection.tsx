import { Card, CardContent } from "@/components/ui/card";
import { Shield, Globe, TrendingUp, Users, DollarSign, Lock } from "lucide-react";
import aboutImage from "@/assets/about.jpg";

const stats = [
  {
    icon: Users,
    label: "Active Users",
    value: "500+",
    color: "text-blue-400"
  },
  {
    icon: DollarSign,
    label: "Total Deposited",
    value: "$2.3M+",
    color: "text-green-400"
  },
  {
    icon: Shield,
    label: "Transparent Operations",
    value: "100%",
    color: "text-blue-400"
  }
];

const features = [
  {
    icon: Globe,
    title: "Serving users worldwide",
    description: "Our platform is accessible to investors globally"
  },
  {
    icon: Lock,
    title: "Security-first approach",
    description: "Protected deposits and encrypted systems"
  },
  {
    icon: TrendingUp,
    title: "Continuous improvement",
    description: "Always adding new features for smarter investing"
  }
];

const AboutSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - About Image */}
          <div className="relative animate-fade-in-up">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src={aboutImage} 
                alt="About Forexcomplex - Professional crypto investment platform" 
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          {/* Right side - Content */}
          <div className="space-y-8">
            <div className="animate-fade-in-up">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                About <span className="text-blue-500">Forexcomplex</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Built on Trust. Driven by Results.
              </p>
            </div>

            <div className="space-y-6 animate-fade-in-up animation-delay-200">
              <p className="text-muted-foreground text-lg leading-relaxed">
                Forexcomplex was created to make crypto investing simple, transparent, and accessible to everyone.
              </p>
              
              <p className="text-muted-foreground text-lg leading-relaxed">
                Our system allows users to invest directly from their available balance, with automatic tracking and withdrawals.
              </p>
              
              <p className="text-muted-foreground text-lg leading-relaxed">
                We believe in clarity over complexity — that's why our dashboards are designed for beginners and pros alike.
              </p>
              
              <p className="text-muted-foreground text-lg leading-relaxed">
                Security and transparency are at the heart of what we do: every transaction is logged, and profits are visible in real time.
              </p>
              
              <p className="text-foreground text-lg font-semibold">
                Our mission: to help everyday investors grow their wealth without stress.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-4 animate-fade-in-up animation-delay-400">
              {features.map((feature, index) => (
                <Card key={index} className="bg-card border-border hover:border-blue-500/50 transition-all duration-300 hover:scale-105 group">
                  <CardContent className="p-4 text-center">
                    <feature.icon className="h-8 w-8 text-blue-500 mx-auto mb-2 group-hover:text-blue-400 transition-colors duration-300" />
                    <h4 className="text-foreground font-semibold text-sm mb-1">{feature.title}</h4>
                    <p className="text-muted-foreground text-xs">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stats Bar */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/30 animate-fade-in-up animation-delay-600">
              <div className="grid grid-cols-3 gap-4 text-center">
                {stats.map((stat, index) => (
                  <div key={index} className="group">
                    <stat.icon className={`h-6 w-6 ${stat.color} mx-auto mb-2 group-hover:scale-110 transition-transform duration-300`} />
                    <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                    <div className="text-muted-foreground text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Founded info */}
            <div className="text-center animate-fade-in-up animation-delay-800">
              <p className="text-muted-foreground">
                Founded in 2024 – built by a team of experienced traders and developers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
