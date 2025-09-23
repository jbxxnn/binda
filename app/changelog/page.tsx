"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Tag, Settings, Zap, Bug, Plus, HelpCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import Header from "@/components/landing/header";
import Footer from "@/components/landing/footer";

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch' | 'feature';
  title: string;
  description: string;
  changes: {
    type: 'added' | 'fixed' | 'improved' | 'changed' | 'deprecated' | 'removed';
    description: string;
  }[];
}

const changelogData: ChangelogEntry[] = [
  {
    version: "1.2.0",
    date: "2025-09-23",
    type: "major",
    title: "Enhanced Onboarding Experience",
    description: "Complete redesign of the onboarding flow with multi-step setup and improved user experience.",
    changes: [
      { type: "added", description: "Multi-step onboarding process with progress indicator" },
      { type: "added", description: "Business type selection and description fields" },
      { type: "added", description: "User preferences setup during onboarding" },
      { type: "added", description: "Accounting settings configuration" },
      { type: "improved", description: "Real-time slug availability checking" },
      { type: "improved", description: "Form pre-population for existing businesses" },
      { type: "improved", description: "Cross-device preference synchronization" }
    ]
  },
  {
    version: "1.1.5",
    date: "2025-09-20",
    type: "patch",
    title: "Bug Fixes & Improvements",
    description: "Various bug fixes and performance improvements across the platform.",
    changes: [
      { type: "fixed", description: "Currency display issues in dashboard charts" },
      { type: "fixed", description: "Slug conflict error when updating business information" },
      { type: "fixed", description: "Preferences not applying immediately after onboarding" },
      { type: "improved", description: "Loading states and error handling" },
      { type: "improved", description: "Form validation and user feedback" }
    ]
  },
  {
    version: "1.1.0",
    date: "2025-09-18",
    type: "minor",
    title: "Subscription Management",
    description: "Added comprehensive subscription management features for customers.",
    changes: [
      { type: "added", description: "Customer subscription fields and management" },
      { type: "added", description: "Subscription status tracking and analytics" },
      { type: "added", description: "Recurring billing date management" },
      { type: "added", description: "Subscription history and notes" },
      { type: "improved", description: "Customer detail views with subscription info" }
    ]
  },
  {
    version: "1.0.8",
    date: "2025-09-11",
    type: "patch",
    title: "Database & Performance",
    description: "Backend improvements and database optimizations.",
    changes: [
      { type: "fixed", description: "SQL ambiguity issues in account balance functions" },
      { type: "improved", description: "Database query performance" },
      { type: "improved", description: "Error handling and logging" },
      { type: "added", description: "User preferences database storage" }
    ]
  },
  {
    version: "1.0.5",
    date: "2025-08-25",
    type: "minor",
    title: "Accounting Settings",
    description: "Comprehensive accounting settings and configuration options.",
    changes: [
      { type: "added", description: "Accounting settings page with full configuration" },
      { type: "added", description: "Invoice numbering and prefix settings" },
      { type: "added", description: "Tax rate and payment terms configuration" },
      { type: "added", description: "Late fee settings and reminder preferences" },
      { type: "improved", description: "Settings persistence and validation" }
    ]
  },
  {
    version: "1.0.0",
    date: "2025-08-15",
    type: "major",
    title: "Initial Release",
    description: "Launch of Binda - Your comprehensive business management platform.",
    changes: [
      { type: "added", description: "Dashboard with key metrics and charts" },
      { type: "added", description: "Customer management system" },
      { type: "added", description: "Transaction tracking and categorization" },
      { type: "added", description: "Invoice creation and management" },
      { type: "added", description: "Financial reports and analytics" },
      { type: "added", description: "User authentication and business setup" },
      { type: "added", description: "Multi-currency support with African currencies" },
      { type: "added", description: "Timezone support for global users" }
    ]
  }
];

const changeTypeIcons = {
  added: Plus,
  fixed: Bug,
  improved: Zap,
  changed: Settings,
  deprecated: Tag,
  removed: Tag
};

const changeTypeColors = {
  added: "bg-green-100 text-green-800 border-green-200 font-mono",
  fixed: "bg-red-100 text-red-800 border-red-200",
  improved: "bg-blue-100 text-blue-800 border-blue-200 font-mono",
  changed: "bg-yellow-100 text-yellow-800 border-yellow-200 font-mono",
  deprecated: "bg-gray-100 text-gray-800 border-gray-200 font-mono",
  removed: "bg-red-100 text-red-800 border-red-200"
};

const versionTypeColors = {
  major: "bg-purple-100 text-purple-800 border-purple-200",
  minor: "bg-blue-100 text-blue-800 border-blue-200",
  patch: "bg-green-100 text-green-800 border-green-200",
  feature: "bg-orange-100 text-orange-800 border-orange-200"
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Header />
          <div className="mb-8 mt-12">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" className="text-brand-snowman bg-brand-hunter hover:bg-brand-underworld hover:text-brand-snowman" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 font-mono text-brand-hunter">Changelog</h1>
            <p className="text-lg text-gray-600 font-mono text-brand-hunter">
              Stay up to date with the latest features, improvements, and fixes in Binda
            </p>
          </div>

          {/* Changelog Entries */}
          <div className="space-y-6">
            {changelogData.map((entry) => {
              // const IconComponent = changeTypeIcons[entry.changes[0]?.type] || Plus;
              
              return (
                <Card key={entry.version} className="overflow-hidden border-brand-hunter shadow-none rounded-sm">
                  <CardHeader className="bg-brand-tropical border-b">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge 
                            className={`${versionTypeColors[entry.type]} font-semibold font-mono hover:bg-brand-underworld hover:text-brand-snowman`}
                          >
                            {entry.type.toUpperCase()}
                          </Badge>
                          <h2 className="text-2xl font-bold text-gray-900 font-mono text-brand-hunter">
                            Version {entry.version}
                          </h2>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 font-mono text-brand-hunter">
                          {entry.title}
                        </h3>
                        <p className="text-gray-600 font-mono text-brand-hunter">
                          {entry.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 font-mono text-brand-hunter">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(entry.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {entry.changes.map((change, changeIndex) => {
                        const ChangeIcon = changeTypeIcons[change.type];
                        
                        return (
                          <div key={changeIndex} className="flex items-start gap-3">
                            <div className={`p-1 rounded-full ${changeTypeColors[change.type]}`}>
                              <ChangeIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${changeTypeColors[change.type]} font-mono`}
                                >
                                  {change.type.charAt(0).toUpperCase() + change.type.slice(1)}
                                </Badge>
                              </div>
                              <p className="text-gray-700 font-mono text-brand-hunter">{change.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 rounded-sm shadow-none">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 font-mono text-brand-hunter">
                  Have feedback or suggestions?
                </h3>
                <p className="text-gray-600 mb-4 font-mono text-brand-hunter">
                  We&apos;d love to hear from you! Your feedback helps us improve Binda.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" className="text-brand-snowman bg-brand-hunter hover:bg-brand-underworld hover:text-brand-snowman" asChild>
                    <Link href="/feedback">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Feedback
                    </Link>
                  </Button>
                  <Button variant="outline" className="text-brand-snowman bg-brand-hunter hover:bg-brand-underworld hover:text-brand-snowman" asChild>
                    <Link href="/support">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Get Support
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
