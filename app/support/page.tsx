"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Search, 
  MessageSquare, 
  Mail, 
  Phone, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  BookOpen,
  Video,
  FileText,
  Settings,
  CreditCard,
  Users,
  BarChart3,
  Shield,
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

interface SupportArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ElementType;
  url: string;
}

const faqData: FAQ[] = [
  {
    id: "1",
    question: "How do I set up my business account?",
    answer: "To set up your business account, go through our onboarding process by clicking 'Get Started' on the homepage. You&apos;ll be guided through business information, preferences, and accounting settings. The process takes about 5 minutes.",
    category: "Getting Started",
    tags: ["onboarding", "setup", "account"]
  },
  {
    id: "2",
    question: "How do I add my first customer?",
    answer: "Navigate to the Customers page from the sidebar, then click 'Add Customer'. Fill in the customer details including name, email, and contact information. You can also add subscription details if applicable.",
    category: "Customers",
    tags: ["customers", "add", "management"]
  },
  {
    id: "3",
    question: "How do I create an invoice?",
    answer: "Go to the Invoices page and click 'Create Invoice'. Select a customer, add line items, set quantities and prices, and configure payment terms. The system will automatically generate an invoice number.",
    category: "Invoicing",
    tags: ["invoices", "create", "billing"]
  },
  {
    id: "4",
    question: "How do I change my currency settings?",
    answer: "Go to Settings > User Preferences and select your preferred currency from the dropdown. Changes will be applied immediately across all pages. You can choose from USD, EUR, GBP, NGN, and many other currencies.",
    category: "Settings",
    tags: ["currency", "preferences", "settings"]
  },
  {
    id: "5",
    question: "How do I track my business expenses?",
    answer: "Use the Transactions page to record all your business expenses. Categorize them properly for better reporting. You can also set up recurring transactions for regular expenses like rent or subscriptions.",
    category: "Transactions",
    tags: ["expenses", "transactions", "tracking"]
  },
  {
    id: "6",
    question: "How do I generate financial reports?",
    answer: "Go to the Reports section to access various financial reports including Profit & Loss, Cash Flow, Balance Sheet, and Sales Analytics. Reports can be filtered by date range and exported in multiple formats.",
    category: "Reports",
    tags: ["reports", "financial", "analytics"]
  },
  {
    id: "7",
    question: "Is my data secure?",
    answer: "Yes, we take data security seriously. All data is encrypted in transit and at rest. We use industry-standard security practices and comply with data protection regulations. Your data is never shared with third parties without your consent.",
    category: "Security",
    tags: ["security", "privacy", "data"]
  },
  {
    id: "8",
    question: "How do I backup my data?",
    answer: "Your data is automatically backed up daily. You can also manually export your data from Settings > Data Management. We recommend keeping local backups of important financial data.",
    category: "Data Management",
    tags: ["backup", "export", "data"]
  },
  {
    id: "9",
    question: "Can I use Binda on mobile devices?",
    answer: "Yes, Binda is fully responsive and works great on mobile devices. You can access all features through your mobile browser. We&apos;re also working on dedicated mobile apps.",
    category: "Mobile",
    tags: ["mobile", "responsive", "apps"]
  },
  {
    id: "10",
    question: "How do I contact support?",
    answer: "You can contact support through multiple channels: submit feedback through the Feedback page, email us at support@getbinda.com, or use the live chat feature (when available). We typically respond within 24 hours.",
    category: "Support",
    tags: ["contact", "support", "help"]
  }
];

const supportArticles: SupportArticle[] = [
  {
    id: "1",
    title: "Getting Started Guide",
    description: "Complete guide to setting up your Binda account and first steps",
    category: "Getting Started",
    icon: BookOpen,
    url: "#"
  },
  {
    id: "2",
    title: "Video Tutorials",
    description: "Watch step-by-step video tutorials for all major features",
    category: "Tutorials",
    icon: Video,
    url: "#"
  },
  {
    id: "3",
    title: "Invoice Management",
    description: "Learn how to create, send, and manage invoices effectively",
    category: "Invoicing",
    icon: FileText,
    url: "#"
  },
  {
    id: "4",
    title: "Customer Management",
    description: "Best practices for managing your customer relationships",
    category: "Customers",
    icon: Users,
    url: "#"
  },
  {
    id: "5",
    title: "Financial Reports",
    description: "Understanding and using financial reports for business insights",
    category: "Reports",
    icon: BarChart3,
    url: "#"
  },
  {
    id: "6",
    title: "Settings & Preferences",
    description: "Configure your account settings and preferences",
    category: "Settings",
    icon: Settings,
    url: "#"
  },
  {
    id: "7",
    title: "Billing & Subscriptions",
    description: "Manage your subscription and billing information",
    category: "Billing",
    icon: CreditCard,
    url: "#"
  },
  {
    id: "8",
    title: "Security & Privacy",
    description: "Learn about our security measures and privacy policies",
    category: "Security",
    icon: Shield,
    url: "#"
  }
];

const categories = [
  "All",
  "Getting Started",
  "Customers",
  "Invoicing",
  "Settings",
  "Transactions",
  "Reports",
  "Security",
  "Data Management",
  "Mobile",
  "Support"
];

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    alert("Thank you for your message! We'll get back to you within 24 hours.");
    setContactForm({ name: "", email: "", subject: "", message: "" });
    setIsSubmittingContact(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <Header />
          <div className="mb-8 mt-12">
            <div className="flex items-center gap-4 mb-4">
              <Button size="sm" asChild className="bg-brand-hunter text-brand-snowman rounded-sm">
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Support Center</h1>
            <p className="text-lg text-gray-600">
              Find answers, get help, and learn how to make the most of Binda
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search for help, features, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 text-lg border-brand-tropical rounded-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card className="border-brand-tropical shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start bg-brand-hunter text-brand-snowman rounded-sm" asChild>
                      <Link href="/dashboard/feedback">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Submit Feedback
                      </Link>
                    </Button>
                    <Button className="w-full justify-start bg-brand-hunter text-brand-snowman rounded-sm">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Support
                    </Button>
                    <Button className="w-full justify-start bg-brand-hunter text-brand-snowman rounded-sm">
                      <Phone className="w-4 h-4 mr-2" />
                      Call Support
                    </Button>
                  </CardContent>
                </Card>

                {/* Categories */}
                <Card className="border-brand-tropical shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`w-full text-left px-3 py-2 rounded-sm transition-colors ${
                            selectedCategory === category
                              ? 'bg-blue-100 text-blue-800'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Info */}
                <Card className="border-brand-tropical shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>support@getbinda.com</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>+234 708 677 5909</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>Mon-Fri 9AM-6PM EST</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="space-y-8">
                {/* Knowledge Base */}
                <Card className="border-brand-tropical shadow-none">
                  <CardHeader>
                    <CardTitle className="text-xl">Knowledge Base</CardTitle>
                    <CardDescription>
                      Browse our comprehensive guides and tutorials
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {supportArticles.map((article) => {
                        const IconComponent = article.icon;
                        return (
                          <div
                            key={article.id}
                            className="p-4 border border-brand-tropical rounded-sm hover:border-blue-300 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start gap-3">
                              <IconComponent className="w-5 h-5 text-blue-600 mt-1" />
                              <div>
                                <h3 className="font-medium text-gray-900">{article.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{article.description}</p>
                                <Badge variant="outline" className="mt-2 text-xs border-brand-tropical rounded-sm">
                                  {article.category}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* FAQ Section */}
                <Card className="border-brand-tropical shadow-none">
                  <CardHeader>
                    <CardTitle className="text-xl">Frequently Asked Questions</CardTitle>
                    <CardDescription>
                      Find quick answers to common questions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredFAQs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No FAQs found matching your search.
                        </div>
                      ) : (
                        filteredFAQs.map((faq) => (
                          <div key={faq.id} className="border border-brand-tropical rounded-sm">
                            <button
                              className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                              onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                            >
                              <div>
                                <h3 className="font-medium text-gray-900">{faq.question}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs border-brand-tropical rounded-sm">
                                    {faq.category}
                                  </Badge>
                                  {faq.tags.map((tag) => (
                                    <span key={tag} className="text-xs text-gray-500">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {expandedFAQ === faq.id ? (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                              )}
                            </button>
                            {expandedFAQ === faq.id && (
                              <div className="px-4 pb-4">
                                <p className="text-gray-700">{faq.answer}</p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Form */}
                <Card className="border-brand-tropical shadow-none">
                  <CardHeader>
                    <CardTitle className="text-xl">Still Need Help?</CardTitle>
                    <CardDescription>
                      Can&apos;t find what you&apos;re looking for? Send us a message and we&apos;ll get back to you.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            id="name"
                            value={contactForm.name}
                            onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                            required
                            className="border-brand-tropical rounded-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={contactForm.email}
                            onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                            required
                            className="border-brand-tropical rounded-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="subject">Subject *</Label>
                        <Input
                          id="subject"
                          value={contactForm.subject}
                          onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                          required
                          className="border-brand-tropical rounded-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                          id="message"
                          rows={4}
                          value={contactForm.message}
                          onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Describe your issue or question in detail..."
                          required
                          className="border-brand-tropical rounded-sm"
                        />
                      </div>
                      <Button type="submit" disabled={isSubmittingContact} className="w-full bg-brand-hunter text-brand-snowman rounded-sm">
                        {isSubmittingContact ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
          <Footer />
    </div>
  );
}
