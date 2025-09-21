"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePreferences } from "@/lib/contexts/preferences-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  // CardDescription,
  // CardHeader,
  // CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
// import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, Building2, Settings, Calculator, Sparkles } from "lucide-react";

interface BusinessInfo {
  name: string;
  slug: string;
  type: string;
  description: string;
}

interface UserPreferences {
  currency: string;
  timezone: string;
  dateFormat: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

interface AccountingSettings {
  invoicePrefix: string;
  invoiceNumbering: string;
  taxRate: number;
  paymentTerms: number;
}

const BUSINESS_TYPES = [
  "Consulting",
  "E-commerce",
  "Retail",
  "Restaurant",
  "Professional Services",
  "Freelance",
  "SaaS",
  "Manufacturing",
  "Healthcare",
  "Education",
  "Other"
];

const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "MAD" },
  { code: "TND", name: "Tunisian Dinar", symbol: "DT" },
  { code: "DZD", name: "Algerian Dinar", symbol: "DA" },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
  { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK" },
  { code: "BWP", name: "Botswana Pula", symbol: "P" },
  { code: "NAD", name: "Namibian Dollar", symbol: "N$" },
  { code: "XOF", name: "West African CFA Franc", symbol: "CFA" },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA" }
];

const TIMEZONES = [
  "Africa/Lagos", "Africa/Cairo", "Africa/Johannesburg", "Africa/Nairobi",
  "Africa/Casablanca", "Africa/Tunis", "Africa/Algiers", "Africa/Addis_Ababa",
  "Africa/Kampala", "Africa/Dar_es_Salaam", "Africa/Lusaka", "Africa/Gaborone",
  "Africa/Windhoek", "Africa/Abidjan", "Africa/Douala", "Africa/Libreville",
  "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris",
  "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney"
];

const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (EU)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" }
];

const STEPS = [
  { id: 1, title: "Business Info", icon: Building2, description: "Tell us about your business" },
  { id: 2, title: "Preferences", icon: Settings, description: "Set your preferences" },
  { id: 3, title: "Accounting", icon: Calculator, description: "Configure accounting settings" },
  { id: 4, title: "Welcome", icon: Sparkles, description: "You're all set!" }
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [hasExistingBusiness, setHasExistingBusiness] = useState(false);
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);

  // Form data
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: "",
    slug: "",
    type: "",
    description: ""
  });

  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    currency: "USD",
    timezone: "Africa/Lagos",
    dateFormat: "MM/DD/YYYY",
    notifications: {
      email: true,
      push: true,
      sms: false
    }
  });

  const [accountingSettings, setAccountingSettings] = useState<AccountingSettings>({
    invoicePrefix: "INV",
    invoiceNumbering: "sequential",
    taxRate: 0,
    paymentTerms: 30
  });

  const router = useRouter();
  const { refreshPreferences, preferences: currentPreferences } = usePreferences();

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }
      
      setUser(user);
      
      // Check if user already has a business (for display purposes only)
      const { data: businesses } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id);
      
      if (businesses && businesses.length > 0) {
        setHasExistingBusiness(true);
        // Pre-populate form with existing business data
        const existingBusiness = businesses[0];
        setBusinessInfo(prev => ({
          ...prev,
          name: existingBusiness.name || '',
          slug: existingBusiness.slug || '',
          type: existingBusiness.settings?.business_type || '',
          description: existingBusiness.settings?.description || ''
        }));
        
        // For existing businesses, we know the slug is available (it's their own)
        if (existingBusiness.slug) {
          setSlugAvailable(true);
          setOriginalSlug(existingBusiness.slug);
        }

        // Load user preferences
        const { data: preferencesData } = await supabase
          .from('user_preferences')
          .select('preferences')
          .eq('user_id', user.id)
          .single();

        if (preferencesData?.preferences) {
          const prefs = preferencesData.preferences;
          setUserPreferences(prev => ({
            ...prev,
            currency: prefs.currency || 'USD',
            timezone: prefs.timezone || 'Africa/Lagos',
            dateFormat: prefs.date_format || 'MM/DD/YYYY',
            notifications: prefs.notifications || {
              email: true,
              push: true,
              sms: false
            }
          }));
        }

        // Load accounting settings
        const { data: accountingData } = await supabase
          .from('accounting_settings')
          .select('*')
          .eq('business_id', existingBusiness.id)
          .single();

        if (accountingData) {
          setAccountingSettings(prev => ({
            ...prev,
            invoicePrefix: accountingData.invoice_prefix || 'INV',
            invoiceNumbering: accountingData.invoice_numbering || 'sequential',
            taxRate: accountingData.tax_rate || 0,
            paymentTerms: accountingData.payment_terms_days || 30
          }));
        }
      }
      
      // Note: Removed automatic redirect to dashboard
      // Users can now access onboarding even if they have a business
      // This allows for re-onboarding or testing purposes
    };
    
    checkUser();
  }, [router]);

  // Sync form with current preferences when component mounts
  useEffect(() => {
    if (currentPreferences && !hasExistingBusiness) {
      setUserPreferences(prev => ({
        ...prev,
        currency: currentPreferences.currency || 'USD',
        timezone: currentPreferences.timezone || 'Africa/Lagos',
        dateFormat: currentPreferences.date_format || 'MM/DD/YYYY',
        notifications: currentPreferences.notifications || {
          email: true,
          push: true,
          sms: false
        }
      }));
    }
  }, [currentPreferences, hasExistingBusiness]);

  // Generate business slug from business name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleBusinessNameChange = (value: string) => {
    setBusinessInfo(prev => ({ ...prev, name: value }));
    const newSlug = generateSlug(value);
    setBusinessInfo(prev => ({ ...prev, slug: newSlug }));
    if (newSlug) {
      checkSlugAvailability(newSlug);
    }
  };

  const handleBusinessSlugChange = (value: string) => {
    setBusinessInfo(prev => ({ ...prev, slug: value }));
    if (value) {
      checkSlugAvailability(value);
    }
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug) {
      setSlugAvailable(null);
      return;
    }

    // If user has existing business and is using the same slug, it's available
    if (hasExistingBusiness && originalSlug && slug === originalSlug) {
      setSlugAvailable(true);
      return;
    }

    setIsCheckingSlug(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('businesses')
        .select('slug')
        .eq('slug', slug)
        .single();

      if (error && error.code === 'PGRST116') {
        setSlugAvailable(true);
      } else if (error) {
        console.error('Error checking slug:', error);
        setSlugAvailable(null);
      } else {
        setSlugAvailable(false);
      }
    } catch (error) {
      console.error('Error checking slug:', error);
      setSlugAvailable(null);
    } finally {
      setIsCheckingSlug(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // For existing businesses, allow proceeding if all fields are filled
        // For new businesses, also require slug availability check
        const hasRequiredFields = businessInfo.name.trim() && 
                                 businessInfo.slug.trim() && 
                                 businessInfo.type;
        
        if (hasExistingBusiness) {
          return hasRequiredFields;
        } else {
          return hasRequiredFields && slugAvailable === true;
        }
      case 2:
        return userPreferences.currency && userPreferences.timezone;
      case 3:
        return true; // Accounting settings are optional
      case 4:
        return false; // Final step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/create-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessInfo,
          userPreferences,
          accountingSettings
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create business');
      }

      console.log('Business created successfully:', result.business);
      
      // Refresh preferences context to load the latest data from database
      try {
        await refreshPreferences();
      } catch (prefError) {
        console.error('Error refreshing preferences:', prefError);
        // Don't fail the entire process for preferences refresh error
      }
      
      router.push("/dashboard");
    } catch (error) {
      console.error('Business creation error:', error);
      setError(error instanceof Error ? error.message : "Failed to create business");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Tell us about your business</h2>
              <p className="text-muted-foreground">
                This information will help us customize your experience
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="My Awesome Business"
                  required
                  value={businessInfo.name}
                  onChange={(e) => handleBusinessNameChange(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="businessSlug">Business URL *</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">binda.app/</span>
                  <Input
                    id="businessSlug"
                    type="text"
                    placeholder="my-awesome-business"
                    required
                    value={businessInfo.slug}
                    onChange={(e) => handleBusinessSlugChange(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  {isCheckingSlug && (
                    <span className="text-xs text-muted-foreground">Checking availability...</span>
                  )}
                  {slugAvailable === true && (
                    <span className="text-xs text-green-600">
                      ✓ {hasExistingBusiness && originalSlug === businessInfo.slug ? 'Your current URL' : 'Available'}
                    </span>
                  )}
                  {slugAvailable === false && (
                    <span className="text-xs text-red-600">✗ Already taken</span>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="businessType">Business Type *</Label>
                <Select value={businessInfo.type} onValueChange={(value) => setBusinessInfo(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Brief description of your business"
                  value={businessInfo.description}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Set your preferences</h2>
              <p className="text-muted-foreground">
                These settings will be used throughout the application
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="currency">Default Currency *</Label>
                <Select value={userPreferences.currency} onValueChange={(value) => setUserPreferences(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="timezone">Timezone *</Label>
                <Select value={userPreferences.timezone} onValueChange={(value) => setUserPreferences(prev => ({ ...prev, timezone: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select value={userPreferences.dateFormat} onValueChange={(value) => setUserPreferences(prev => ({ ...prev, dateFormat: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>{format.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>Notification Preferences</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={userPreferences.notifications.email}
                      onCheckedChange={(checked) => setUserPreferences(prev => ({ 
                        ...prev, 
                        notifications: { ...prev.notifications, email: checked }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notifications">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive browser notifications</p>
                    </div>
                    <Switch
                      id="push-notifications"
                      checked={userPreferences.notifications.push}
                      onCheckedChange={(checked) => setUserPreferences(prev => ({ 
                        ...prev, 
                        notifications: { ...prev.notifications, push: checked }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sms-notifications">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive updates via SMS</p>
                    </div>
                    <Switch
                      id="sms-notifications"
                      checked={userPreferences.notifications.sms}
                      onCheckedChange={(checked) => setUserPreferences(prev => ({ 
                        ...prev, 
                        notifications: { ...prev.notifications, sms: checked }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Configure accounting settings</h2>
              <p className="text-muted-foreground">
                Set up your basic accounting preferences
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                <Input
                  id="invoicePrefix"
                  type="text"
                  placeholder="INV"
                  value={accountingSettings.invoicePrefix}
                  onChange={(e) => setAccountingSettings(prev => ({ ...prev, invoicePrefix: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Prefix for invoice numbers (e.g., INV-001)</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invoiceNumbering">Invoice Numbering</Label>
                <Select value={accountingSettings.invoiceNumbering} onValueChange={(value) => setAccountingSettings(prev => ({ ...prev, invoiceNumbering: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select numbering system" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequential (001, 002, 003...)</SelectItem>
                    <SelectItem value="date_based">Date-based (2024-001, 2024-002...)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0.00"
                  value={accountingSettings.taxRate}
                  onChange={(e) => setAccountingSettings(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="paymentTerms">Default Payment Terms (days)</Label>
                <Input
                  id="paymentTerms"
                  type="number"
                  min="1"
                  placeholder="30"
                  value={accountingSettings.paymentTerms}
                  onChange={(e) => setAccountingSettings(prev => ({ ...prev, paymentTerms: parseInt(e.target.value) || 30 }))}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Welcome to Binda! 🎉</h2>
              <p className="text-muted-foreground">
                Your business account has been set up successfully. You&apos;re ready to start managing your finances!
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">What&apos;s next?</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Add your first customer</li>
                  <li>• Create an invoice</li>
                  <li>• Set up your chart of accounts</li>
                  <li>• Record your first transaction</li>
                </ul>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-blue-900">Quick Tips</h3>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• Use the dashboard to track your business performance</li>
                  <li>• Set up recurring invoices for regular customers</li>
                  <li>• Keep your books updated regularly for better insights</li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh w-full bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {hasExistingBusiness ? 'Update Your Business' : 'Welcome to Binda'}
            </h1>
            <p className="text-gray-600">
              {hasExistingBusiness 
                ? 'Update your business settings and preferences' 
                : "Let's get your business set up in just a few steps"
              }
            </p>
            {hasExistingBusiness && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  You already have a business account. This will update your existing settings.
                </p>
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep >= step.id 
                      ? 'bg-primary border-primary text-white' 
                      : 'border-gray-300 text-gray-400'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      currentStep > step.id ? 'bg-primary' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <Progress value={(currentStep / STEPS.length) * 100} className="h-2" />
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              {STEPS.map((step) => (
                <span key={step.id} className={`${
                  currentStep >= step.id ? 'text-primary font-medium' : ''
                }`}>
                  {step.title}
                </span>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <Card>
            <CardContent className="p-8">
              {renderStepContent()}
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </Button>

                {currentStep < 4 ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={isLoading}
                    className="flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{hasExistingBusiness ? 'Updating your business...' : 'Creating your business...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{hasExistingBusiness ? 'Update Business' : 'Get Started'}</span>
                        <Sparkles className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}