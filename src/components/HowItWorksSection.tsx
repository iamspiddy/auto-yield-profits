import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Wallet, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Create An Account",
    description: "Simply click on the register button to create a free account for yourself. Its quick and easy."
  },
  {
    icon: Wallet,
    title: "Make Deposit",
    description: "Pick a plan of your choice from our investment plans. Make a deposit to your personal wallet."
  },
  {
    icon: TrendingUp,
    title: "Financial Growth",
    description: "Watch your daily earnings live. Be ready to place a withdrawal as soon as your investment is completed."
  }
];

const metrics = [
  {
    title: "Total Deposit",
    value: "$55B",
    isHighlighted: false
  },
  {
    title: "Proceeded Transactions",
    value: "$5B",
    isHighlighted: false
  },
  {
    title: "Total Withdrawal",
    value: "$3B",
    isHighlighted: true
  }
];

const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        {/* Three Easy Steps Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 animate-fade-in-up">
            Three <span className="text-blue-500 animate-pulse">Easy</span> Steps
          </h2>
          <p className="text-xl text-white max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
            Its fast and easy to get started with us in three simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <Card 
              key={index} 
              className="bg-black border-gray-800 hover:border-blue-500 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 animate-fade-in-up group"
              style={{ animationDelay: `${(index + 1) * 200}ms` }}
            >
              <CardContent className="text-center p-8">
                <div className="mx-auto mb-6 w-16 h-16 bg-white rounded-full flex items-center justify-center border-2 border-gray-300 group-hover:border-blue-500 group-hover:bg-blue-50 transition-all duration-500 group-hover:scale-110">
                  <div className="w-4 h-4 bg-black rounded-sm group-hover:bg-blue-500 transition-colors duration-500"></div>
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors duration-500">
                  {step.title}
                </h3>
                <p className="text-white group-hover:text-gray-300 transition-colors duration-500">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Financial Metrics Section */}
        <div className="grid md:grid-cols-3 gap-8">
          {metrics.map((metric, index) => (
            <Card 
              key={index} 
              className="bg-black border-gray-800 hover:border-blue-500 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 animate-fade-in-up group"
              style={{ animationDelay: `${(index + 4) * 200}ms` }}
            >
              <CardContent className="text-center p-8">
                <div className={`mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center border-2 border-gray-300 transition-all duration-500 group-hover:scale-110 ${
                  metric.isHighlighted 
                    ? 'bg-orange-500 group-hover:bg-orange-400 group-hover:border-orange-400' 
                    : 'bg-white group-hover:bg-blue-50 group-hover:border-blue-500'
                }`}>
                  <div className={`w-4 h-4 rounded-sm transition-colors duration-500 ${
                    metric.isHighlighted 
                      ? 'bg-black group-hover:bg-orange-100' 
                      : 'bg-black group-hover:bg-blue-500'
                  }`}></div>
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors duration-500">
                  {metric.title}
                </h3>
                <p className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors duration-500 animate-count-up">
                  {metric.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;