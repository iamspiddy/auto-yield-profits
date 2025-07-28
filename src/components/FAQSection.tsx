import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";

const faqs = [
  {
    question: "How are profits generated?",
    answer: "Our team uses a mix of low-risk trading strategies, yield farming, and arbitrage opportunities. We focus on proven, sustainable methods that generate consistent returns while preserving capital."
  },
  {
    question: "Can I withdraw anytime?",
    answer: "Yes, absolutely. Withdrawals are processed manually within 24–48 hours. There are no lock-up periods or penalties for withdrawing your funds."
  },
  {
    question: "Is this DeFi or staking?",
    answer: "No, this is a centralized platform managed by professionals. You don't need any technical knowledge about DeFi protocols or staking. We handle all the complexity for you."
  },
  {
    question: "What's the minimum deposit?",
    answer: "Just $50 to get started. This low minimum allows anyone to begin earning passive crypto income without a large initial investment."
  },
  {
    question: "Is there a referral program?",
    answer: "Yes — earn 2% commission from all deposits your referrals make. Referral income is paid out weekly along with your regular earnings. There's no limit to how many people you can refer."
  },
  {
    question: "What cryptocurrencies do you accept?",
    answer: "We currently accept USDT, BTC, and ETH. These are the most stable and liquid cryptocurrencies, making them ideal for our earning strategies."
  },
  {
    question: "How often are profits distributed?",
    answer: "Profits are distributed weekly or monthly, depending on your preference. You can change your payout frequency anytime in your dashboard settings."
  },
  {
    question: "Is my capital guaranteed?",
    answer: "While we use low-risk strategies, cryptocurrency investments always carry risk. We're transparent about all risks and provide detailed reporting on our strategies and performance."
  }
];

const FAQSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about earning passive crypto income
            </p>
          </div>

          <Card className="bg-gradient-card shadow-card border-0">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-border/50">
                  <AccordionTrigger className="text-left text-foreground hover:text-primary px-6 py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground px-6 pb-4 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>

          {/* Contact Support */}
          <div className="mt-12 text-center">
            <Card className="inline-block p-6 bg-gradient-card shadow-card border-0">
              <p className="text-muted-foreground mb-2">Still have questions?</p>
              <p className="font-semibold text-foreground">Contact our support team for personalized assistance</p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;