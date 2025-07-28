import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah M.",
    role: "Small Business Owner",
    content: "I started with $100 and now earn every week — no stress. The platform is incredibly easy to use and the returns are consistent.",
    rating: 5,
    earnings: "+$340 in 3 months"
  },
  {
    name: "Mike T.",
    role: "Software Developer", 
    content: "The referral system helped me turn $50 into $500. My friends love it too, and we're all earning passively now.",
    rating: 5,
    earnings: "+$450 from referrals"
  },
  {
    name: "Jennifer L.",
    role: "Marketing Manager",
    content: "It's the easiest crypto platform I've used. No complex DeFi protocols or staking — just deposit and earn. Exactly what I needed.",
    rating: 5,
    earnings: "+$220 monthly average"
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            What Our Users Say
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real stories from users earning passive crypto income
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-gradient-card shadow-card hover:shadow-primary transition-all duration-300 group hover:-translate-y-2 border-0">
              <CardContent className="p-8 space-y-6">
                {/* Quote Icon */}
                <Quote className="h-8 w-8 text-primary/20" />
                
                {/* Rating */}
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-muted-foreground leading-relaxed italic">
                  "{testimonial.content}"
                </p>

                {/* Earnings Highlight */}
                <div className="bg-success/10 rounded-lg p-3 border border-success/20">
                  <p className="text-success font-semibold text-sm">
                    {testimonial.earnings}
                  </p>
                </div>

                {/* Author */}
                <div className="border-t border-border pt-4">
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Social Proof Numbers */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">500+</div>
            <p className="text-muted-foreground">Active Users</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-success">$2.3M+</div>
            <p className="text-muted-foreground">Total Deposits</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">$180K+</div>
            <p className="text-muted-foreground">Profits Distributed</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;