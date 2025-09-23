import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

export default function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: "Free",
      period: "forever",
      description: "Perfect for small businesses getting started",
      features: [
        "Up to 100 customers",
        "Basic invoicing",
        "Simple reporting",
        "Email support",
        "Mobile access"
      ],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Professional",
      price: "$10",
      period: "per month",
      description: "Ideal for growing businesses",
      features: [
        "Unlimited customers",
        "Advanced invoicing",
        "Detailed analytics",
        "Priority support",
        "API access",
        "Custom branding",
        "Advanced reporting"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "$100",
      period: "per month",
      description: "For large organizations",
      features: [
        "Everything in Professional",
        "Dedicated account manager",
        "Custom integrations",
        "Advanced security",
        "White-label options",
        "Custom training",
        "SLA guarantee"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-left md:text-center text-3xl md:text-4xl text-brand-hunter mb-4">
            Simple, transparent <span className="text-brand-mint">pricing</span>
          </h2>
          <p className="text-left md:text-center text-xl text-brand-underworld max-w-3xl mx-auto">
            Choose the plan that fits your business needs. No hidden fees, no surprises.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${
                plan.popular 
                  ? 'border-brand-tropical shadow-lg scale-105 mb-8' 
                  : 'border-gray-200 mb-8'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-brand-tropical text-white px-4 py-1 rounded-full text-sm">
                    Most Popular
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl text-brand-hunter">
                  {plan.name}
                </CardTitle>
                <div className="mt-4">
                  <span className="text-4xl text-brand-hunter">{plan.price}</span>
                  <span className="text-brand-underworld ml-2">{plan.period}</span>
                </div>
                <p className="text-brand-underworld mt-2">{plan.description}</p>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="w-5 h-5 text-brand-underworld mr-3 flex-shrink-0" />
                      <span className="text-brand-underworld">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link href="/auth/signup" className="block">
                  <Button 
                    className={`w-full ${
                      plan.popular
                        ? 'bg-brand-tropical text-white hover:bg-brand-tropical/90'
                        : 'bg-brand-underworld text-white hover:bg-brand-underworld/90'
                    } rounded-sm`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-brand-underworld mb-4">
            Need a custom solution? We&apos;re here to help.
          </p>
          <Link href="/contact">
            <Button variant="outline" className="rounded-sm">
              Contact Sales
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
