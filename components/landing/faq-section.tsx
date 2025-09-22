"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";

export default function FAQSection() {
  const [openItem, setOpenItem] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I get started with Binda?",
      answer: "Getting started is easy! Simply sign up for a free account, complete the onboarding process, and you'll be ready to manage your business in minutes. No credit card required for the free plan."
    },
    {
      question: "Can I migrate my existing business data?",
      answer: "Yes! Binda supports data import from popular accounting software like QuickBooks, Xero, and others. Our team can also help with custom data migrations if needed."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use bank-level encryption, regular security audits, and comply with GDPR and other data protection regulations. Your data is stored securely and never shared with third parties."
    },
    {
      question: "Do you offer customer support?",
      answer: "Yes! We provide email support for all users, priority support for Professional plans, and dedicated account management for Enterprise customers. We also have comprehensive documentation and video tutorials."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees. You'll continue to have access to your data even after cancellation."
    },
    {
      question: "Do you offer custom integrations?",
      answer: "Yes! Our Enterprise plan includes custom integrations with your existing tools and workflows. We also have an API that developers can use to build custom solutions."
    }
  ];

  const toggleItem = (index: number) => {
    setOpenItem(openItem === index ? null : index);
  };

  return (
    <section id="faq" className="py-32 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-left md:text-center text-3xl md:text-4xl text-brand-hunter mb-4">
            Frequently Asked <span className="text-brand-tropical">Questions</span>
          </h2>
          <p className="text-left md:text-center text-xl text-brand-tropical">
            Everything you need to know about Binda
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="border-brand-tropical rounded-sm shadow-none">
              <button
                onClick={() => toggleItem(index)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg text-brand-hunter pr-4">
                  {faq.question}
                </h3>
                <ChevronDown 
                  className={`w-5 h-5 text-brand-hunter transition-transform ${
                    openItem === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {openItem === index && (
                <CardContent className="pt-0 pb-6">
                  <p className="text-brand-hunter leading-relaxed">
                    {faq.answer}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
