"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle } from "lucide-react";

export default function FeaturesSection() {
  const [activeFeature, setActiveFeature] = useState("smart-solutions");

  const features = [
    {
      id: "smart-solutions",
      title: "Smart Financial Solutions",
      description: "Advanced accounting and financial management tools",
      image: "/dashboard.png",
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
      image: "/customer.png",
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
      image: "/invoice.png",
      details: [
        "Professional invoice templates",
        "Automated payment reminders",
        "Payment gateway integration",
        "Recurring billing setup"
      ]
    },
    {
      id: "security-compliance",
      title: "Security & Compliance",
      description: "Enterprise-grade security and compliance",
      image: "/settings.png",
      details: [
        "Bank-level encryption",
        "GDPR compliance",
        "Regular security audits",
        "Data backup & recovery"
      ]
    }
  ];

  const activeFeatureData = features.find(f => f.id === activeFeature);

  return (
    <section id="features" className="py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-left md:text-center text-3xl md:text-4xl text-gray-900 mb-4">
            Everything you need to <span className="text-brand-tropical">grow your business</span>
          </h2>
          <p className="text-left md:text-center text-xl text-gray-600 max-w-3xl mx-auto">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-0 md:px-16 py-8">
            <div>
              <h3 className="text-2xl text-gray-900 mb-4">
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
            <div className="bg-gradient-to-br from-brand-tropical/10 to-brand-hunter/10 rounded-sm mb-4">
              <div className="text-center flex flex-col items-center justify-between mb-8">
                <div className="relative w-full h-96 mb-4">
                  <Image
                    src={activeFeatureData.image}
                    alt={activeFeatureData.title}
                    fill
                    className="object-contain rounded-lg"
                    priority
                  />
                </div>
                <h4 className="text-xl text-gray-900 mb-2 px-4">
                  {activeFeatureData.title}
                </h4>
                <p className="text-gray-600 px-4">
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
