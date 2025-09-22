"use client";

import { useState } from "react";
// import { Card, CardContent } from "@/components/ui/card";
import { 
  BarChart3, 
  Users, 
  FileText, 
//   CreditCard, 
  Shield, 
//   Smartphone,
//   Zap,
//   TrendingUp,
//   Settings,
//   Globe,
//   Clock,
  CheckCircle
} from "lucide-react";

export default function FeaturesSection() {
  const [activeFeature, setActiveFeature] = useState("smart-solutions");

  const features = [
    {
      id: "smart-solutions",
      title: "Smart Financial Solutions",
      description: "Advanced accounting and financial management tools",
      icon: BarChart3,
      details: [
        "Real-time financial reporting",
        "Automated expense tracking",
        "Multi-currency support",
        "Tax preparation tools"
      ]
    },
    {
      id: "customer-management",
      title: "Customer Management",
      description: "Comprehensive customer relationship management",
      icon: Users,
      details: [
        "Customer database management",
        "Subscription tracking",
        "Communication history",
        "Customer analytics"
      ]
    },
    {
      id: "invoicing-billing",
      title: "Invoicing & Billing",
      description: "Streamlined invoicing and payment processing",
      icon: FileText,
      details: [
        "Professional invoice templates",
        "Automated payment reminders",
        "Payment gateway integration",
        "Recurring billing setup"
      ]
    },
    // {
    //   id: "payment-processing",
    //   title: "Payment Processing",
    //   description: "Secure and efficient payment handling",
    //   icon: CreditCard,
    //   details: [
    //     "Multiple payment methods",
    //     "Secure transaction processing",
    //     "Payment analytics",
    //     "Refund management"
    //   ]
    // },
    {
      id: "security-compliance",
      title: "Security & Compliance",
      description: "Enterprise-grade security and compliance",
      icon: Shield,
      details: [
        "Bank-level encryption",
        "GDPR compliance",
        "Regular security audits",
        "Data backup & recovery"
      ]
    }
    // {
    //   id: "mobile-access",
    //   title: "Mobile Access",
    //   description: "Access your business anywhere, anytime",
    //   icon: Smartphone,
    //   details: [
    //     "Mobile-responsive design",
    //     "Offline capabilities",
    //     "Push notifications",
    //     "Mobile app integration"
    //   ]
    // }
  ];

  const activeFeatureData = features.find(f => f.id === activeFeature);

  return (
    <section id="features" className="py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything you need to <span className="text-brand-tropical">grow your business</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful tools and features designed to streamline your operations and boost productivity
          </p>
        </div>

        {/* Feature Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {features.map((feature) => {
            // const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(feature.id)}
                className={`p-4 rounded-lg text-center transition-all ${
                  activeFeature === feature.id
                    ? 'bg-brand-tropical text-brand-hunter rounded-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {/* <Icon className="w-8 h-8 mx-auto mb-2" /> */}
                <div className="text-sm font-medium">{feature.title}</div>
              </button>
            );
          })}
        </div>

        {/* Active Feature Details */}
        {activeFeatureData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-16 py-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {activeFeatureData.title}
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                {activeFeatureData.description}
              </p>
              <ul className="space-y-3">
                {activeFeatureData.details.map((detail, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-brand-tropical mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-brand-tropical/10 to-brand-hunter/10 rounded-2xl p-8 min-h-[500px] flex items-center justify-center">
              <div className="text-center">
                <activeFeatureData.icon className="w-24 h-24 text-brand-tropical mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  {activeFeatureData.title}
                </h4>
                <p className="text-gray-600">
                  Experience the power of {activeFeatureData.title.toLowerCase()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
