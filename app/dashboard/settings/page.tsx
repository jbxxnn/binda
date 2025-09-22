"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePreferences } from "@/lib/contexts/preferences-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
// import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2,
  User,
  Shield,
  Settings as SettingsIcon,
  DollarSign,
//   Bell,
  Download,
  Trash2,
  Save,
  Loader,
  Eye,
  EyeOff,
  CheckCircle,
  MessageCircle
} from "lucide-react";

interface BusinessProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  website?: string;
  description?: string;
}


interface AccountingSettings {
  id?: string;
  business_id?: string;
  fiscal_year_start: string;
  default_currency: string;
  tax_rate: number;
  invoice_prefix: string;
  invoice_numbering: 'sequential' | 'date_based';
  invoice_start_number: number;
  quote_prefix: string;
  quote_numbering: 'sequential' | 'date_based';
  quote_start_number: number;
  payment_terms_days: number;
  late_fee_rate: number;
  late_fee_type: 'percentage' | 'fixed';
  auto_send_reminders: boolean;
  reminder_days_before_due: number;
  reminder_days_after_due: number;
}

export default function SettingsPage() {
  const { preferences, updatePreferences, refreshPreferences } = usePreferences();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Local state for preferences form management
  const [localPreferences, setLocalPreferences] = useState({
    timezone: 'America/New_York',
    currency: 'USD',
    date_format: 'MM/DD/YYYY',
    notifications: {
      email: true,
      push: true,
      sms: false
    }
  });
  
  // Validation functions
  const isValidWebsite = (url: string) => {
    if (!url || url.trim() === '') return true; // Empty is valid
    const pattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    return pattern.test(url.trim());
  };

  const isValidWhatsAppNumber = (phone: string) => {
    if (!phone || phone.trim() === '') return true; // Empty is valid
    // WhatsApp numbers should start with + and contain only digits, spaces, parentheses, and hyphens
    const pattern = /^\+[\d\s\(\)\-]{7,20}$/;
    return pattern.test(phone.trim());
  };
  
  // Business Profile State
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
    website: '',
    description: ''
  });


  // Accounting Settings State
  const [accountingSettings, setAccountingSettings] = useState<AccountingSettings>({
    fiscal_year_start: '2024-01-01',
    default_currency: 'USD',
    tax_rate: 0,
    invoice_prefix: 'INV',
    invoice_numbering: 'sequential',
    invoice_start_number: 1,
    quote_prefix: 'QUO',
    quote_numbering: 'sequential',
    quote_start_number: 1,
    payment_terms_days: 30,
    late_fee_rate: 0,
    late_fee_type: 'percentage',
    auto_send_reminders: false,
    reminder_days_before_due: 7,
    reminder_days_after_due: 3
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);


  // Update time every second for timezone display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Sync local preferences with context when preferences load
  useEffect(() => {
    if (preferences && !isLoading) {
      setLocalPreferences({
        timezone: preferences.timezone || 'America/New_York',
        currency: preferences.currency || 'USD',
        date_format: preferences.date_format || 'MM/DD/YYYY',
        notifications: preferences.notifications || {
          email: true,
          push: true,
          sms: false
        }
      });
    }
  }, [preferences, isLoading]);

  const fetchSettings = async () => {
    try {
      const supabase = createClient();
      
      // Get current user and business
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        toast.error('Failed to get user information');
        return;
      }
      
      if (!user) {
        console.log('No user found');
        return;
      }

      console.log('Fetching business for user:', user.id);

      const { data: businesses, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (businessError) {
        console.error('Error fetching business:', businessError);
        toast.error('Failed to load business information');
        return;
      }

      if (businesses) {
        console.log('Business found:', businesses);
        setBusinessProfile({
          id: businesses.id,
          name: businesses.name || '',
          email: businesses.email || '',
          phone: businesses.phone || '',
          address: businesses.address || '',
          city: businesses.city || '',
          state: businesses.state || '',
          zip_code: businesses.zip_code || '',
          country: businesses.country || 'US',
          website: businesses.website || '',
          description: businesses.description || ''
        });
      } else {
        console.log('No business found for user');
        toast.error('No business found. Please contact support.');
      }

      // User preferences are now handled by the global context

      // Fetch accounting settings from database
      const { data: accountingData, error: accountingError } = await supabase
        .from('accounting_settings')
        .select('*')
        .eq('business_id', businesses.id)
        .single();

      if (accountingError) {
        console.error('Error fetching accounting settings:', accountingError);
        // If no settings exist, create default ones
        if (accountingError.code === 'PGRST116') {
          console.log('No accounting settings found, will create on first save');
          // Keep default settings
        } else {
          // Fallback to localStorage if database fails
          const savedAccounting = localStorage.getItem('accountingSettings');
          if (savedAccounting) {
            setAccountingSettings(JSON.parse(savedAccounting));
          }
        }
      } else {
        setAccountingSettings(accountingData);
      }

    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBusinessProfile = async () => {
    // Validation
    if (!businessProfile.name.trim()) {
      toast.error('Business name is required');
      return;
    }

    // Validate website format if provided
    if (businessProfile.website && businessProfile.website.trim() && !isValidWebsite(businessProfile.website)) {
      toast.error('Please enter a valid website URL');
      return;
    }

    // Validate WhatsApp number format if provided
    if (businessProfile.phone && businessProfile.phone.trim() && !isValidWhatsAppNumber(businessProfile.phone)) {
      toast.error('Please enter a valid WhatsApp number (e.g., +1 555 123 4567)');
      return;
    }

    if (!businessProfile.id) {
      toast.error('Business ID not found. Please refresh the page.');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      
      console.log('Updating business profile:', businessProfile);
      
      const updateData = {
        name: businessProfile.name.trim(),
        email: businessProfile.email?.trim() || null,
        phone: businessProfile.phone?.trim() || null,
        address: businessProfile.address?.trim() || null,
        city: businessProfile.city?.trim() || null,
        state: businessProfile.state?.trim() || null,
        zip_code: businessProfile.zip_code?.trim() || null,
        country: businessProfile.country?.trim() || 'US',
        website: businessProfile.website?.trim() || null,
        description: businessProfile.description?.trim() || null
      };
      
      const { data, error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', businessProfile.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Business profile updated successfully:', data);
      toast.success('Business profile updated successfully');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating business profile:', error);
      toast.error(`Failed to update business profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUserPreferences = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // Request notification permissions if enabled
      if (localPreferences.notifications.push) {
        await requestNotificationPermission();
      }
      
      // Update preferences in context (which will save to database)
      await updatePreferences(localPreferences);
      
      // Refresh preferences to ensure we have the latest data
      await refreshPreferences();
      
      setSaveSuccess(true);
      toast.success('User preferences saved successfully');
      
      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(`Failed to save preferences: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notification permission granted');
        // Send a test notification
        new Notification('Binda Settings', {
          body: 'Notifications are now enabled! You\'ll receive updates about your business.',
          icon: '/favicon.ico'
        });
      } else {
        toast.error('Notification permission denied');
        // Disable push notifications if permission denied
        setLocalPreferences(prev => ({
          ...prev,
          notifications: { ...prev.notifications, push: false }
        }));
      }
    } else {
      toast.error('This browser does not support notifications');
      setLocalPreferences(prev => ({
        ...prev,
        notifications: { ...prev.notifications, push: false }
      }));
    }
  };

  // Test notification function
  const testNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from Binda!',
        icon: '/favicon.ico'
      });
    } else {
      toast.error('Please enable notifications first');
    }
  };

  const handleSaveAccountingSettings = async () => {
    try {
      const supabase = createClient();
      
      // Get current user and business
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to save settings');
        return;
      }

      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!businesses) {
        toast.error('No business found');
        return;
      }

      console.log('Saving accounting settings for business:', businesses.id);
      console.log('Accounting settings data:', accountingSettings);

      // Validate accounting settings
      if (accountingSettings.tax_rate < 0 || accountingSettings.tax_rate > 100) {
        toast.error('Tax rate must be between 0 and 100');
        return;
      }

      if (accountingSettings.payment_terms_days < 0) {
        toast.error('Payment terms must be a positive number');
        return;
      }

      if (accountingSettings.late_fee_rate < 0) {
        toast.error('Late fee rate must be a positive number');
        return;
      }

      // Save to database using upsert with proper conflict resolution
      const { error } = await supabase
        .from('accounting_settings')
        .upsert({
          business_id: businesses.id,
          fiscal_year_start: accountingSettings.fiscal_year_start,
          default_currency: accountingSettings.default_currency,
          tax_rate: accountingSettings.tax_rate,
          invoice_prefix: accountingSettings.invoice_prefix,
          invoice_numbering: accountingSettings.invoice_numbering,
          invoice_start_number: accountingSettings.invoice_start_number,
          quote_prefix: accountingSettings.quote_prefix,
          quote_numbering: accountingSettings.quote_numbering,
          quote_start_number: accountingSettings.quote_start_number,
          payment_terms_days: accountingSettings.payment_terms_days,
          late_fee_rate: accountingSettings.late_fee_rate,
          late_fee_type: accountingSettings.late_fee_type,
          auto_send_reminders: accountingSettings.auto_send_reminders,
          reminder_days_before_due: accountingSettings.reminder_days_before_due,
          reminder_days_after_due: accountingSettings.reminder_days_after_due
        }, {
          onConflict: 'business_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error saving accounting settings:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error(`Failed to save accounting settings: ${error.message || 'Unknown error'}`);
        return;
      }

      // Also save to localStorage as backup
      localStorage.setItem('accountingSettings', JSON.stringify(accountingSettings));
      
      toast.success('Accounting settings saved successfully');
    } catch (error) {
      console.error('Error saving accounting settings:', error);
      toast.error('Failed to save accounting settings');
    }
  };

  const validatePassword = (password: string) => {
    const errors = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    if (!/\d/.test(password)) errors.push('One number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One special character');
    return errors;
  };

  const handleChangePassword = async () => {
    // Validation
    if (!passwordData.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    if (!passwordData.newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword === passwordData.currentPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    const passwordErrors = validatePassword(passwordData.newPassword);
    if (passwordErrors.length > 0) {
      toast.error(`Password must contain: ${passwordErrors.join(', ')}`);
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      
      // First verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('Unable to verify current user');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      });

      if (signInError) {
        toast.error('Current password is incorrect');
        return;
      }
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        toast.error(`Failed to update password: ${error.message}`);
        return;
      }

      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('Failed to update password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async (format: 'json' | 'csv' | 'excel' = 'json') => {
    try {
      const supabase = createClient();
      
      // Get all business data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to export data');
        return;
      }

      const { data: businesses } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (!businesses) {
        toast.error('No business found');
        return;
      }

      // Get all related data
      const [customersResult, invoicesResult, transactionsResult, categoriesResult, accountsResult] = await Promise.all([
        supabase.from('customers').select('*').eq('business_id', businesses.id),
        supabase.from('invoices').select('*').eq('business_id', businesses.id),
        supabase.from('transactions').select('*').eq('business_id', businesses.id),
        supabase.from('categories').select('*').eq('business_id', businesses.id),
        supabase.from('accounts').select('*').eq('business_id', businesses.id)
      ]);

      const exportData = {
        business: businesses,
        customers: customersResult.data || [],
        invoices: invoicesResult.data || [],
        transactions: transactionsResult.data || [],
        categories: categoriesResult.data || [],
        accounts: accountsResult.data || [],
        exportInfo: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          format: format,
          recordCounts: {
            customers: customersResult.data?.length || 0,
            invoices: invoicesResult.data?.length || 0,
            transactions: transactionsResult.data?.length || 0,
            categories: categoriesResult.data?.length || 0,
            accounts: accountsResult.data?.length || 0
          }
        }
      };

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `business-data-${timestamp}`;

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        downloadFile(blob, `${filename}.json`);
      } else if (format === 'csv') {
        // Convert to CSV format
        const csvData = convertToCSV(exportData);
        const blob = new Blob([csvData], { type: 'text/csv' });
        downloadFile(blob, `${filename}.csv`);
      } else if (format === 'excel') {
        // For Excel, we'll use a simple CSV format for now
        // In a real app, you'd use a library like xlsx
        const csvData = convertToCSV(exportData);
        const blob = new Blob([csvData], { type: 'application/vnd.ms-excel' });
        downloadFile(blob, `${filename}.xlsx`);
      }

      toast.success(`Data exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  interface ExportData {
    business: Record<string, unknown>;
    customers: Record<string, unknown>[];
    invoices: Record<string, unknown>[];
    transactions: Record<string, unknown>[];
    categories: Record<string, unknown>[];
    accounts: Record<string, unknown>[];
  }

  const convertToCSV = (data: ExportData) => {
    const sections = [];
    
    // Business info
    sections.push('BUSINESS INFORMATION');
    sections.push('Name,Email,Phone,Address,City,State,Country,Created At');
    sections.push(`${data.business.name || ''},${data.business.email || ''},${data.business.phone || ''},${data.business.address || ''},${data.business.city || ''},${data.business.state || ''},${data.business.country || ''},${data.business.created_at || ''}`);
    sections.push('');
    
    // Customers
    if (data.customers.length > 0) {
      sections.push('CUSTOMERS');
      sections.push('Name,Email,Phone,Type,Address,City,State,Country,Created At');
      data.customers.forEach((customer: Record<string, unknown>) => {
        sections.push(`${customer.name || ''},${customer.email || ''},${customer.phone || ''},${customer.customer_type || ''},${customer.address || ''},${customer.city || ''},${customer.state || ''},${customer.country || ''},${customer.created_at || ''}`);
      });
      sections.push('');
    }
    
    // Invoices
    if (data.invoices.length > 0) {
      sections.push('INVOICES');
      sections.push('Invoice Number,Customer,Amount,Status,Due Date,Created At');
      data.invoices.forEach((invoice: Record<string, unknown>) => {
        sections.push(`${invoice.invoice_number || ''},${invoice.customer_name || ''},${invoice.total_amount || ''},${invoice.status || ''},${invoice.due_date || ''},${invoice.created_at || ''}`);
      });
      sections.push('');
    }
    
    // Transactions
    if (data.transactions.length > 0) {
      sections.push('TRANSACTIONS');
      sections.push('Type,Category,Description,Amount,Date,Created At');
      data.transactions.forEach((transaction: Record<string, unknown>) => {
        sections.push(`${transaction.type || ''},${transaction.category || ''},${transaction.description || ''},${transaction.amount || ''},${transaction.transaction_date || ''},${transaction.created_at || ''}`);
      });
      sections.push('');
    }
    
    return sections.join('\n');
  };

  const handleDeleteAccount = async () => {
    // This would need proper confirmation and implementation
    toast.error('Account deletion is not yet implemented. Please contact support.');
  };

  const tabs = [
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'preferences', label: 'Preferences', icon: User },
    { id: 'accounting', label: 'Accounting', icon: DollarSign },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data Management', icon: Download }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <Loader className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full relative w-full max-w-full overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full max-w-full min-w-0">
        {/* Page Header */}
        <div className="px-6 py-4 border-b bg-brand-lightning">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="h-6 w-6" />
            <h1 className="text-2xl font-medium">Settings</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 w-full max-w-full">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Sidebar Navigation */}
              <div className="lg:w-64 space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {tab.label}
                    </Button>
                  );
                })}
              </div>

              {/* Settings Content */}
              <div className="flex-1 space-y-6">
                {/* Business Profile Tab */}
                {activeTab === 'profile' && (
                  <Card>
                     <CardHeader>
                       <CardTitle>Business Profile</CardTitle>
                       <CardDescription>Update your business information</CardDescription>
                       
                       
                       {process.env.NODE_ENV === 'development' && (
                         <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                           <strong>Debug:</strong> Business ID: {businessProfile.id || 'Not loaded'}
                         </div>
                       )}
                     </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <Label htmlFor="business-name">Business Name *</Label>
                           <Input
                             id="business-name"
                             value={businessProfile.name}
                             onChange={(e) => setBusinessProfile(prev => ({ ...prev, name: e.target.value }))}
                             placeholder="Your Business Name"
                             required
                           />
                           {!businessProfile.name.trim() && (
                             <p className="text-sm text-red-600">Business name is required</p>
                           )}
                         </div>
                        <div className="space-y-2">
                          <Label htmlFor="business-email">Email</Label>
                          <Input
                            id="business-email"
                            type="email"
                            value={businessProfile.email}
                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="business@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="business-phone" className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-green-600" />
                            WhatsApp Number
                          </Label>
                          <Input
                            id="business-phone"
                            value={businessProfile.phone}
                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+1 (555) 123-4567"
                          />
                          {businessProfile.phone && businessProfile.phone.trim() && !isValidWhatsAppNumber(businessProfile.phone) && (
                            <p className="text-xs text-amber-600">
                              Please enter a valid WhatsApp number (e.g., +1 555 123 4567)
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            This phone number will be used for WhatsApp Business communications
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="business-website">Website</Label>
                          <Input
                            id="business-website"
                            type="url"
                            value={businessProfile.website}
                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, website: e.target.value }))}
                            placeholder="https://yourwebsite.com or yourwebsite.com"
                          />
                          {businessProfile.website && businessProfile.website.trim() && !isValidWebsite(businessProfile.website) && (
                            <p className="text-xs text-amber-600">
                              Please enter a valid website URL (e.g., https://example.com or example.com)
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="business-address">Address</Label>
                        <Input
                          id="business-address"
                          value={businessProfile.address}
                          onChange={(e) => setBusinessProfile(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="123 Main Street"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="business-city">City</Label>
                          <Input
                            id="business-city"
                            value={businessProfile.city}
                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="New York"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="business-state">State</Label>
                          <Input
                            id="business-state"
                            value={businessProfile.state}
                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, state: e.target.value }))}
                            placeholder="NY"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="business-zip">ZIP Code</Label>
                          <Input
                            id="business-zip"
                            value={businessProfile.zip_code}
                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, zip_code: e.target.value }))}
                            placeholder="10001"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="business-country">Country</Label>
                        <select
                          id="business-country"
                          value={businessProfile.country}
                          onChange={(e) => setBusinessProfile(prev => ({ ...prev, country: e.target.value }))}
                          className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                          aria-label="Select country"
                        >
                          <option value="US">🇺🇸 United States</option>
                          <option value="CA">🇨🇦 Canada</option>
                          <option value="GB">🇬🇧 United Kingdom</option>
                          <option value="AU">🇦🇺 Australia</option>
                          <option value="DE">🇩🇪 Germany</option>
                          <option value="FR">🇫🇷 France</option>
                          <option value="IT">🇮🇹 Italy</option>
                          <option value="ES">🇪🇸 Spain</option>
                          <option value="NL">🇳🇱 Netherlands</option>
                          <option value="BE">🇧🇪 Belgium</option>
                          <option value="CH">🇨🇭 Switzerland</option>
                          <option value="AT">🇦🇹 Austria</option>
                          <option value="SE">🇸🇪 Sweden</option>
                          <option value="NO">🇳🇴 Norway</option>
                          <option value="DK">🇩🇰 Denmark</option>
                          <option value="FI">🇫🇮 Finland</option>
                          <option value="IE">🇮🇪 Ireland</option>
                          <option value="PT">🇵🇹 Portugal</option>
                          <option value="GR">🇬🇷 Greece</option>
                          <option value="PL">🇵🇱 Poland</option>
                          <option value="CZ">🇨🇿 Czech Republic</option>
                          <option value="HU">🇭🇺 Hungary</option>
                          <option value="RO">🇷🇴 Romania</option>
                          <option value="BG">🇧🇬 Bulgaria</option>
                          <option value="HR">🇭🇷 Croatia</option>
                          <option value="SI">🇸🇮 Slovenia</option>
                          <option value="SK">🇸🇰 Slovakia</option>
                          <option value="LT">🇱🇹 Lithuania</option>
                          <option value="LV">🇱🇻 Latvia</option>
                          <option value="EE">🇪🇪 Estonia</option>
                          <option value="LU">🇱🇺 Luxembourg</option>
                          <option value="MT">🇲🇹 Malta</option>
                          <option value="CY">🇨🇾 Cyprus</option>
                          <option value="JP">🇯🇵 Japan</option>
                          <option value="KR">🇰🇷 South Korea</option>
                          <option value="CN">🇨🇳 China</option>
                          <option value="IN">🇮🇳 India</option>
                          <option value="SG">🇸🇬 Singapore</option>
                          <option value="HK">🇭🇰 Hong Kong</option>
                          <option value="TW">🇹🇼 Taiwan</option>
                          <option value="TH">🇹🇭 Thailand</option>
                          <option value="MY">🇲🇾 Malaysia</option>
                          <option value="ID">🇮🇩 Indonesia</option>
                          <option value="PH">🇵🇭 Philippines</option>
                          <option value="VN">🇻🇳 Vietnam</option>
                          <option value="BR">🇧🇷 Brazil</option>
                          <option value="AR">🇦🇷 Argentina</option>
                          <option value="CL">🇨🇱 Chile</option>
                          <option value="CO">🇨🇴 Colombia</option>
                          <option value="MX">🇲🇽 Mexico</option>
                          <option value="PE">🇵🇪 Peru</option>
                          <option value="UY">🇺🇾 Uruguay</option>
                          <option value="ZA">🇿🇦 South Africa</option>
                          <option value="EG">🇪🇬 Egypt</option>
                          <option value="NG">🇳🇬 Nigeria</option>
                          <option value="KE">🇰🇪 Kenya</option>
                          <option value="MA">🇲🇦 Morocco</option>
                          <option value="TN">🇹🇳 Tunisia</option>
                          <option value="DZ">🇩🇿 Algeria</option>
                          <option value="GH">🇬🇭 Ghana</option>
                          <option value="ET">🇪🇹 Ethiopia</option>
                          <option value="UG">🇺🇬 Uganda</option>
                          <option value="TZ">🇹🇿 Tanzania</option>
                          <option value="ZW">🇿🇼 Zimbabwe</option>
                          <option value="BW">🇧🇼 Botswana</option>
                          <option value="NA">🇳🇦 Namibia</option>
                          <option value="ZM">🇿🇲 Zambia</option>
                          <option value="MW">🇲🇼 Malawi</option>
                          <option value="MZ">🇲🇿 Mozambique</option>
                          <option value="AO">🇦🇴 Angola</option>
                          <option value="CM">🇨🇲 Cameroon</option>
                          <option value="CI">🇨🇮 Côte d&apos;Ivoire</option>
                          <option value="SN">🇸🇳 Senegal</option>
                          <option value="ML">🇲🇱 Mali</option>
                          <option value="BF">🇧🇫 Burkina Faso</option>
                          <option value="NE">🇳🇪 Niger</option>
                          <option value="TD">🇹🇩 Chad</option>
                          <option value="SD">🇸🇩 Sudan</option>
                          <option value="SS">🇸🇸 South Sudan</option>
                          <option value="ER">🇪🇷 Eritrea</option>
                          <option value="DJ">🇩🇯 Djibouti</option>
                          <option value="SO">🇸🇴 Somalia</option>
                          <option value="LY">🇱🇾 Libya</option>
                          <option value="RU">🇷🇺 Russia</option>
                          <option value="UA">🇺🇦 Ukraine</option>
                          <option value="BY">🇧🇾 Belarus</option>
                          <option value="MD">🇲🇩 Moldova</option>
                          <option value="GE">🇬🇪 Georgia</option>
                          <option value="AM">🇦🇲 Armenia</option>
                          <option value="AZ">🇦🇿 Azerbaijan</option>
                          <option value="KZ">🇰🇿 Kazakhstan</option>
                          <option value="UZ">🇺🇿 Uzbekistan</option>
                          <option value="KG">🇰🇬 Kyrgyzstan</option>
                          <option value="TJ">🇹🇯 Tajikistan</option>
                          <option value="TM">🇹🇲 Turkmenistan</option>
                          <option value="MN">🇲🇳 Mongolia</option>
                          <option value="AF">🇦🇫 Afghanistan</option>
                          <option value="PK">🇵🇰 Pakistan</option>
                          <option value="BD">🇧🇩 Bangladesh</option>
                          <option value="LK">🇱🇰 Sri Lanka</option>
                          <option value="MV">🇲🇻 Maldives</option>
                          <option value="NP">🇳🇵 Nepal</option>
                          <option value="BT">🇧🇹 Bhutan</option>
                          <option value="MM">🇲🇲 Myanmar</option>
                          <option value="LA">🇱🇦 Laos</option>
                          <option value="KH">🇰🇭 Cambodia</option>
                          <option value="BN">🇧🇳 Brunei</option>
                          <option value="TL">🇹🇱 East Timor</option>
                          <option value="FJ">🇫🇯 Fiji</option>
                          <option value="PG">🇵🇬 Papua New Guinea</option>
                          <option value="NC">🇳🇨 New Caledonia</option>
                          <option value="VU">🇻🇺 Vanuatu</option>
                          <option value="SB">🇸🇧 Solomon Islands</option>
                          <option value="TO">🇹🇴 Tonga</option>
                          <option value="WS">🇼🇸 Samoa</option>
                          <option value="KI">🇰🇮 Kiribati</option>
                          <option value="TV">🇹🇻 Tuvalu</option>
                          <option value="NR">🇳🇷 Nauru</option>
                          <option value="PW">🇵🇼 Palau</option>
                          <option value="FM">🇫🇲 Micronesia</option>
                          <option value="MH">🇲🇭 Marshall Islands</option>
                          <option value="IS">🇮🇸 Iceland</option>
                          <option value="GL">🇬🇱 Greenland</option>
                          <option value="FO">🇫🇴 Faroe Islands</option>
                          <option value="AD">🇦🇩 Andorra</option>
                          <option value="MC">🇲🇨 Monaco</option>
                          <option value="SM">🇸🇲 San Marino</option>
                          <option value="VA">🇻🇦 Vatican City</option>
                          <option value="LI">🇱🇮 Liechtenstein</option>
                          <option value="AL">🇦🇱 Albania</option>
                          <option value="BA">🇧🇦 Bosnia and Herzegovina</option>
                          <option value="ME">🇲🇪 Montenegro</option>
                          <option value="MK">🇲🇰 North Macedonia</option>
                          <option value="RS">🇷🇸 Serbia</option>
                          <option value="XK">🇽🇰 Kosovo</option>
                          <option value="TR">🇹🇷 Turkey</option>
                          <option value="IL">🇮🇱 Israel</option>
                          <option value="PS">🇵🇸 Palestine</option>
                          <option value="JO">🇯🇴 Jordan</option>
                          <option value="LB">🇱🇧 Lebanon</option>
                          <option value="SY">🇸🇾 Syria</option>
                          <option value="IQ">🇮🇶 Iraq</option>
                          <option value="IR">🇮🇷 Iran</option>
                          <option value="KW">🇰🇼 Kuwait</option>
                          <option value="SA">🇸🇦 Saudi Arabia</option>
                          <option value="AE">🇦🇪 United Arab Emirates</option>
                          <option value="QA">🇶🇦 Qatar</option>
                          <option value="BH">🇧🇭 Bahrain</option>
                          <option value="OM">🇴🇲 Oman</option>
                          <option value="YE">🇾🇪 Yemen</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="business-description">Description</Label>
                        <Textarea
                          id="business-description"
                          value={businessProfile.description}
                          onChange={(e) => setBusinessProfile(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of your business..."
                          rows={3}
                        />
                      </div>

                       <div className="flex items-center gap-4">
                         <Button 
                           onClick={handleSaveBusinessProfile} 
                           disabled={isSaving}
                           className={saveSuccess ? 'bg-green-600 hover:bg-green-700' : ''}
                         >
                           {isSaving ? (
                             <Loader className="h-4 w-4 mr-2 animate-spin" />
                           ) : saveSuccess ? (
                             <CheckCircle className="h-4 w-4 mr-2" />
                           ) : (
                             <Save className="h-4 w-4 mr-2" />
                           )}
                           {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                         </Button>
                         {isSaving && (
                           <p className="text-sm text-muted-foreground">Updating your business profile...</p>
                         )}
                         {saveSuccess && (
                           <p className="text-sm text-green-600">Business profile updated successfully!</p>
                         )}
                       </div>
                    </CardContent>
                  </Card>
                )}

                {/* User Preferences Tab */}
                {activeTab === 'preferences' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>User Preferences</CardTitle>
                      <CardDescription>Customize your experience</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            Timezone
                            <span className="text-xs text-muted-foreground">
                              Current time: {currentTime.toLocaleString('en-US', { 
                                timeZone: localPreferences.timezone,
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </Label>
                          <select
                            title="Timezone"
                            value={localPreferences.timezone}
                            onChange={(e) => setLocalPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                            className="w-full px-3 py-2 border border-brand-tropical rounded-md"
                          >
                            <optgroup label="Americas">
                              <option value="America/New_York">Eastern Time (ET)</option>
                              <option value="America/Chicago">Central Time (CT)</option>
                              <option value="America/Denver">Mountain Time (MT)</option>
                              <option value="America/Los_Angeles">Pacific Time (PT)</option>
                              <option value="America/Toronto">Toronto (ET)</option>
                              <option value="America/Vancouver">Vancouver (PT)</option>
                              <option value="America/Mexico_City">Mexico City (CT)</option>
                              <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                              <option value="America/Argentina/Buenos_Aires">Buenos Aires (ART)</option>
                            </optgroup>
                            <optgroup label="Europe">
                              <option value="Europe/London">London (GMT/BST)</option>
                              <option value="Europe/Paris">Paris (CET/CEST)</option>
                              <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                              <option value="Europe/Rome">Rome (CET/CEST)</option>
                              <option value="Europe/Madrid">Madrid (CET/CEST)</option>
                              <option value="Europe/Amsterdam">Amsterdam (CET/CEST)</option>
                              <option value="Europe/Zurich">Zurich (CET/CEST)</option>
                              <option value="Europe/Stockholm">Stockholm (CET/CEST)</option>
                              <option value="Europe/Oslo">Oslo (CET/CEST)</option>
                              <option value="Europe/Copenhagen">Copenhagen (CET/CEST)</option>
                            </optgroup>
                            <optgroup label="Asia">
                              <option value="Asia/Tokyo">Tokyo (JST)</option>
                              <option value="Asia/Shanghai">Shanghai (CST)</option>
                              <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                              <option value="Asia/Singapore">Singapore (SGT)</option>
                              <option value="Asia/Kolkata">Mumbai (IST)</option>
                              <option value="Asia/Dubai">Dubai (GST)</option>
                              <option value="Asia/Seoul">Seoul (KST)</option>
                              <option value="Asia/Bangkok">Bangkok (ICT)</option>
                              <option value="Asia/Jakarta">Jakarta (WIB)</option>
                              <option value="Asia/Manila">Manila (PHT)</option>
                            </optgroup>
                            <optgroup label="Africa">
                              <option value="Africa/Lagos">Lagos (WAT)</option>
                              <option value="Africa/Cairo">Cairo (EET)</option>
                              <option value="Africa/Johannesburg">Johannesburg (SAST)</option>
                              <option value="Africa/Casablanca">Casablanca (WET/WEST)</option>
                              <option value="Africa/Nairobi">Nairobi (EAT)</option>
                              <option value="Africa/Addis_Ababa">Addis Ababa (EAT)</option>
                              <option value="Africa/Accra">Accra (GMT)</option>
                              <option value="Africa/Abidjan">Abidjan (GMT)</option>
                              <option value="Africa/Dakar">Dakar (GMT)</option>
                              <option value="Africa/Tunis">Tunis (CET)</option>
                              <option value="Africa/Algiers">Algiers (CET)</option>
                              <option value="Africa/Tripoli">Tripoli (EET)</option>
                              <option value="Africa/Khartoum">Khartoum (CAT)</option>
                              <option value="Africa/Kampala">Kampala (EAT)</option>
                              <option value="Africa/Dar_es_Salaam">Dar es Salaam (EAT)</option>
                              <option value="Africa/Lusaka">Lusaka (CAT)</option>
                              <option value="Africa/Harare">Harare (CAT)</option>
                              <option value="Africa/Gaborone">Gaborone (CAT)</option>
                              <option value="Africa/Windhoek">Windhoek (WAT/CAT)</option>
                              <option value="Africa/Cape_Town">Cape Town (SAST)</option>
                            </optgroup>
                            <optgroup label="Oceania">
                              <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                              <option value="Australia/Melbourne">Melbourne (AEST/AEDT)</option>
                              <option value="Australia/Perth">Perth (AWST)</option>
                              <option value="Pacific/Auckland">Auckland (NZST/NZDT)</option>
                            </optgroup>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label>Currency</Label>
                          <select
                            title="Currency"
                            value={localPreferences.currency}
                            onChange={(e) => setLocalPreferences(prev => ({ ...prev, currency: e.target.value }))}
                            className="w-full px-3 py-2 border border-brand-tropical rounded-md"
                          >
                            <optgroup label="Major Currencies">
                              <option value="USD">🇺🇸 USD - US Dollar</option>
                              <option value="EUR">🇪🇺 EUR - Euro</option>
                              <option value="GBP">🇬🇧 GBP - British Pound</option>
                              <option value="JPY">🇯🇵 JPY - Japanese Yen</option>
                              <option value="CHF">🇨🇭 CHF - Swiss Franc</option>
                              <option value="CAD">🇨🇦 CAD - Canadian Dollar</option>
                              <option value="AUD">🇦🇺 AUD - Australian Dollar</option>
                              <option value="NZD">🇳🇿 NZD - New Zealand Dollar</option>
                            </optgroup>
                            <optgroup label="African Currencies">
                              <option value="NGN">🇳🇬 NGN - Nigerian Naira</option>
                              <option value="ZAR">🇿🇦 ZAR - South African Rand</option>
                              <option value="EGP">🇪🇬 EGP - Egyptian Pound</option>
                              <option value="KES">🇰🇪 KES - Kenyan Shilling</option>
                              <option value="GHS">🇬🇭 GHS - Ghanaian Cedi</option>
                              <option value="MAD">🇲🇦 MAD - Moroccan Dirham</option>
                              <option value="TND">🇹🇳 TND - Tunisian Dinar</option>
                              <option value="DZD">🇩🇿 DZD - Algerian Dinar</option>
                              <option value="ETB">🇪🇹 ETB - Ethiopian Birr</option>
                              <option value="UGX">🇺🇬 UGX - Ugandan Shilling</option>
                              <option value="TZS">🇹🇿 TZS - Tanzanian Shilling</option>
                              <option value="ZMW">🇿🇲 ZMW - Zambian Kwacha</option>
                              <option value="BWP">🇧🇼 BWP - Botswanan Pula</option>
                              <option value="NAD">🇳🇦 NAD - Namibian Dollar</option>
                              <option value="XOF">🇸🇳 XOF - West African CFA Franc</option>
                              <option value="XAF">🇨🇲 XAF - Central African CFA Franc</option>
                            </optgroup>
                            <optgroup label="Other Currencies">
                              <option value="CNY">🇨🇳 CNY - Chinese Yuan</option>
                              <option value="INR">🇮🇳 INR - Indian Rupee</option>
                              <option value="BRL">🇧🇷 BRL - Brazilian Real</option>
                              <option value="MXN">🇲🇽 MXN - Mexican Peso</option>
                              <option value="SGD">🇸🇬 SGD - Singapore Dollar</option>
                              <option value="HKD">🇭🇰 HKD - Hong Kong Dollar</option>
                              <option value="NOK">🇳🇴 NOK - Norwegian Krone</option>
                              <option value="SEK">🇸🇪 SEK - Swedish Krona</option>
                              <option value="DKK">🇩🇰 DKK - Danish Krone</option>
                              <option value="PLN">🇵🇱 PLN - Polish Złoty</option>
                              <option value="CZK">🇨🇿 CZK - Czech Koruna</option>
                              <option value="HUF">🇭🇺 HUF - Hungarian Forint</option>
                              <option value="RUB">🇷🇺 RUB - Russian Ruble</option>
                              <option value="TRY">🇹🇷 TRY - Turkish Lira</option>
                              <option value="KRW">🇰🇷 KRW - South Korean Won</option>
                              <option value="THB">🇹🇭 THB - Thai Baht</option>
                              <option value="MYR">🇲🇾 MYR - Malaysian Ringgit</option>
                              <option value="IDR">🇮🇩 IDR - Indonesian Rupiah</option>
                              <option value="PHP">🇵🇭 PHP - Philippine Peso</option>
                            </optgroup>
                          </select>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Notifications</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Email Notifications</Label>
                              <p className="text-sm text-muted-foreground">Receive updates via email</p>
                            </div>
                            <Switch
                              checked={localPreferences.notifications.email}
                              onCheckedChange={(checked: boolean) => setLocalPreferences(prev => ({
                                ...prev,
                                notifications: { ...prev.notifications, email: checked }
                              }))}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Push Notifications</Label>
                              <p className="text-sm text-muted-foreground">Receive browser notifications</p>
                            </div>
                            <Switch
                              checked={localPreferences.notifications.push}
                              onCheckedChange={(checked: boolean) => setLocalPreferences(prev => ({
                                ...prev,
                                notifications: { ...prev.notifications, push: checked }
                              }))}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>SMS Notifications</Label>
                              <p className="text-sm text-muted-foreground">Receive text messages</p>
                            </div>
                            <Switch
                              checked={localPreferences.notifications.sms}
                              onCheckedChange={(checked: boolean) => setLocalPreferences(prev => ({
                                ...prev,
                                notifications: { ...prev.notifications, sms: checked }
                              }))}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <Button onClick={handleSaveUserPreferences} disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : saveSuccess ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              Saved!
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Preferences
                            </>
                          )}
                        </Button>
                        {localPreferences.notifications.push && (
                          <Button 
                            variant="outline" 
                            onClick={testNotification}
                            className="flex items-center gap-2"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Test Notification
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Accounting Settings Tab */}
                {activeTab === 'accounting' && (
                  <div className="space-y-6">
                    {/* Basic Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Basic Accounting Settings</CardTitle>
                        <CardDescription>Configure your basic accounting preferences</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Fiscal Year Start</Label>
                            <Input
                              type="date"
                              value={accountingSettings.fiscal_year_start}
                              onChange={(e) => setAccountingSettings(prev => ({
                                ...prev,
                                fiscal_year_start: e.target.value
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Default Currency</Label>
                            <select
                              title="Default Currency"
                              value={accountingSettings.default_currency}
                              onChange={(e) => setAccountingSettings(prev => ({ ...prev, default_currency: e.target.value }))}
                              className="w-full px-3 py-2 border border-brand-tropical rounded-md"
                            >
                              <optgroup label="Major Currencies">
                                <option value="USD">🇺🇸 USD - US Dollar</option>
                                <option value="EUR">🇪🇺 EUR - Euro</option>
                                <option value="GBP">🇬🇧 GBP - British Pound</option>
                                <option value="JPY">🇯🇵 JPY - Japanese Yen</option>
                                <option value="CHF">🇨🇭 CHF - Swiss Franc</option>
                                <option value="CAD">🇨🇦 CAD - Canadian Dollar</option>
                                <option value="AUD">🇦🇺 AUD - Australian Dollar</option>
                                <option value="NZD">🇳🇿 NZD - New Zealand Dollar</option>
                              </optgroup>
                              <optgroup label="African Currencies">
                                <option value="NGN">🇳🇬 NGN - Nigerian Naira</option>
                                <option value="ZAR">🇿🇦 ZAR - South African Rand</option>
                                <option value="EGP">🇪🇬 EGP - Egyptian Pound</option>
                                <option value="KES">🇰🇪 KES - Kenyan Shilling</option>
                                <option value="GHS">🇬🇭 GHS - Ghanaian Cedi</option>
                                <option value="MAD">🇲🇦 MAD - Moroccan Dirham</option>
                                <option value="TND">🇹🇳 TND - Tunisian Dinar</option>
                                <option value="DZD">🇩🇿 DZD - Algerian Dinar</option>
                                <option value="ETB">🇪🇹 ETB - Ethiopian Birr</option>
                                <option value="UGX">🇺🇬 UGX - Ugandan Shilling</option>
                                <option value="TZS">🇹🇿 TZS - Tanzanian Shilling</option>
                                <option value="ZMW">🇿🇲 ZMW - Zambian Kwacha</option>
                                <option value="BWP">🇧🇼 BWP - Botswanan Pula</option>
                                <option value="NAD">🇳🇦 NAD - Namibian Dollar</option>
                                <option value="XOF">🇸🇳 XOF - West African CFA Franc</option>
                                <option value="XAF">🇨🇲 XAF - Central African CFA Franc</option>
                              </optgroup>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Tax Rate (%)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={accountingSettings.tax_rate}
                              onChange={(e) => setAccountingSettings(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Payment Terms (Days)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={accountingSettings.payment_terms_days}
                              onChange={(e) => setAccountingSettings(prev => ({ ...prev, payment_terms_days: parseInt(e.target.value) || 0 }))}
                              placeholder="30"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Invoice Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Invoice Settings</CardTitle>
                        <CardDescription>Configure how invoices are generated and numbered</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Invoice Prefix</Label>
                            <Input
                              value={accountingSettings.invoice_prefix}
                              onChange={(e) => setAccountingSettings(prev => ({ ...prev, invoice_prefix: e.target.value }))}
                              placeholder="INV"
                              maxLength={10}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Invoice Start Number</Label>
                            <Input
                              type="number"
                              min="1"
                              value={accountingSettings.invoice_start_number}
                              onChange={(e) => setAccountingSettings(prev => ({ ...prev, invoice_start_number: parseInt(e.target.value) || 1 }))}
                              placeholder="1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Invoice Numbering System</Label>
                          <select
                            title="Invoice Numbering"
                            value={accountingSettings.invoice_numbering}
                            onChange={(e) => setAccountingSettings(prev => ({ ...prev, invoice_numbering: e.target.value as 'sequential' | 'date_based' }))}
                            className="w-full px-3 py-2 border border-brand-tropical rounded-md"
                          >
                            <option value="sequential">Sequential (INV-001, INV-002...)</option>
                            <option value="date_based">Date Based (INV-2024-001...)</option>
                          </select>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quote Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Quote Settings</CardTitle>
                        <CardDescription>Configure how quotes are generated and numbered</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Quote Prefix</Label>
                            <Input
                              value={accountingSettings.quote_prefix}
                              onChange={(e) => setAccountingSettings(prev => ({ ...prev, quote_prefix: e.target.value }))}
                              placeholder="QUO"
                              maxLength={10}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Quote Start Number</Label>
                            <Input
                              type="number"
                              min="1"
                              value={accountingSettings.quote_start_number}
                              onChange={(e) => setAccountingSettings(prev => ({ ...prev, quote_start_number: parseInt(e.target.value) || 1 }))}
                              placeholder="1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Quote Numbering System</Label>
                          <select
                            title="Quote Numbering"
                            value={accountingSettings.quote_numbering}
                            onChange={(e) => setAccountingSettings(prev => ({ ...prev, quote_numbering: e.target.value as 'sequential' | 'date_based' }))}
                            className="w-full px-3 py-2 border border-brand-tropical rounded-md"
                          >
                            <option value="sequential">Sequential (QUO-001, QUO-002...)</option>
                            <option value="date_based">Date Based (QUO-2024-001...)</option>
                          </select>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Late Fee Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Late Fee Settings</CardTitle>
                        <CardDescription>Configure late payment fees and penalties</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Late Fee Rate</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={accountingSettings.late_fee_rate}
                              onChange={(e) => setAccountingSettings(prev => ({ ...prev, late_fee_rate: parseFloat(e.target.value) || 0 }))}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Late Fee Type</Label>
                            <select
                              title="Late Fee Type"
                              value={accountingSettings.late_fee_type}
                              onChange={(e) => setAccountingSettings(prev => ({ ...prev, late_fee_type: e.target.value as 'percentage' | 'fixed' }))}
                              className="w-full px-3 py-2 border border-brand-tropical rounded-md"
                            >
                              <option value="percentage">Percentage of invoice amount</option>
                              <option value="fixed">Fixed amount</option>
                            </select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Reminder Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Payment Reminder Settings</CardTitle>
                        <CardDescription>Configure automatic payment reminders</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <input
                              title="Enable automatic payment reminders"
                              type="checkbox"
                              id="auto_send_reminders"
                              checked={accountingSettings.auto_send_reminders}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccountingSettings(prev => ({ ...prev, auto_send_reminders: e.target.checked }))}
                              className="rounded border-brand-tropical"
                            />
                            <Label htmlFor="auto_send_reminders">Enable automatic payment reminders</Label>
                          </div>
                          
                          {accountingSettings.auto_send_reminders && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Days before due date to send reminder</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={accountingSettings.reminder_days_before_due}
                                  onChange={(e) => setAccountingSettings(prev => ({ ...prev, reminder_days_before_due: parseInt(e.target.value) || 0 }))}
                                  placeholder="7"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Days after due date to send reminder</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={accountingSettings.reminder_days_after_due}
                                  onChange={(e) => setAccountingSettings(prev => ({ ...prev, reminder_days_after_due: parseInt(e.target.value) || 0 }))}
                                  placeholder="3"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button onClick={handleSaveAccountingSettings} size="lg">
                        <Save className="h-4 w-4 mr-2" />
                        Save Accounting Settings
                      </Button>
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    {/* Password Security */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Password Security
                        </CardTitle>
                        <CardDescription>Change your account password and manage password requirements</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <div className="relative">
                              <Input
                                id="current-password"
                                type={showPassword ? "text" : "password"}
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                placeholder="Enter current password"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                              id="new-password"
                              type={showPassword ? "text" : "password"}
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                              placeholder="Enter new password"
                            />
                            {passwordData.newPassword && (
                              <div className="text-sm text-muted-foreground">
                                <div className="font-medium mb-1">Password requirements:</div>
                                <ul className="space-y-1">
                                  {validatePassword(passwordData.newPassword).map((error, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                      <span className="text-red-500">✗</span>
                                      <span className="text-red-600">{error}</span>
                                    </li>
                                  ))}
                                  {validatePassword(passwordData.newPassword).length === 0 && (
                                    <li className="flex items-center gap-2">
                                      <span className="text-green-500">✓</span>
                                      <span className="text-green-600">Password meets all requirements</span>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input
                              id="confirm-password"
                              type={showPassword ? "text" : "password"}
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              placeholder="Confirm new password"
                            />
                            {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                              <p className="text-sm text-red-600">Passwords do not match</p>
                            )}
                            {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && passwordData.newPassword && (
                              <p className="text-sm text-green-600">Passwords match</p>
                            )}
                          </div>
                        </div>
                        <Button onClick={handleChangePassword} disabled={isSaving} className="w-full sm:w-auto">
                          <Shield className="h-4 w-4 mr-2" />
                          {isSaving ? 'Updating...' : 'Update Password'}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Two-Factor Authentication */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Two-Factor Authentication
                        </CardTitle>
                        <CardDescription>Add an extra layer of security to your account</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <Shield className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">SMS Authentication</h3>
                              <p className="text-sm text-muted-foreground">Receive verification codes via SMS</p>
                            </div>
                          </div>
                          <Button variant="outline" disabled>
                            <span className="text-muted-foreground">Coming Soon</span>
                          </Button>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Shield className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">Authenticator App</h3>
                              <p className="text-sm text-muted-foreground">Use Google Authenticator or similar apps</p>
                            </div>
                          </div>
                          <Button variant="outline" disabled>
                            <span className="text-muted-foreground">Coming Soon</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Session Management */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Active Sessions
                        </CardTitle>
                        <CardDescription>Manage your active login sessions</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Shield className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">Current Session</h3>
                              <p className="text-sm text-muted-foreground">This device - Active now</p>
                            </div>
                          </div>
                          <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
                            Current
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Session management features will be available soon. For now, you can sign out from all devices by changing your password.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Security Activity */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Security Activity
                        </CardTitle>
                        <CardDescription>Recent security-related activities on your account</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Shield className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Password changed</p>
                              <p className="text-xs text-muted-foreground">Just now</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <Shield className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Successful login</p>
                              <p className="text-xs text-muted-foreground">Today at 2:30 PM</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                              <Shield className="h-4 w-4 text-yellow-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Account settings updated</p>
                              <p className="text-xs text-muted-foreground">Yesterday at 4:15 PM</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Security activity logging will be enhanced in future updates.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Account Recovery */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Account Recovery
                        </CardTitle>
                        <CardDescription>Set up account recovery options</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <Shield className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">Recovery Email</h3>
                              <p className="text-sm text-muted-foreground">Set up a recovery email address</p>
                            </div>
                          </div>
                          <Button variant="outline" disabled>
                            <span className="text-muted-foreground">Coming Soon</span>
                          </Button>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <Shield className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">Security Questions</h3>
                              <p className="text-sm text-muted-foreground">Set up security questions for account recovery</p>
                            </div>
                          </div>
                          <Button variant="outline" disabled>
                            <span className="text-muted-foreground">Coming Soon</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Data Management Tab */}
                {activeTab === 'data' && (
                  <div className="space-y-6">
                    {/* Data Export */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Download className="h-5 w-5" />
                          Data Export
                        </CardTitle>
                        <CardDescription>Export your business data in various formats</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Download className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-medium">JSON Export</h3>
                                <p className="text-sm text-muted-foreground">Complete data with relationships</p>
                              </div>
                            </div>
                            <Button onClick={() => void handleExportData('json')} variant="outline" size="sm">
                              Export JSON
                            </Button>
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <Download className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <h3 className="font-medium">CSV Export</h3>
                                <p className="text-sm text-muted-foreground">Spreadsheet-compatible format</p>
                              </div>
                            </div>
                            <Button onClick={() => void handleExportData('csv')} variant="outline" size="sm">
                              Export CSV
                            </Button>
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <Download className="h-5 w-5 text-orange-600" />
                              </div>
                              <div>
                                <h3 className="font-medium">Excel Export</h3>
                                <p className="text-sm text-muted-foreground">Microsoft Excel format</p>
                              </div>
                            </div>
                            <Button onClick={() => void handleExportData('excel')} variant="outline" size="sm">
                              Export Excel
                            </Button>
                          </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">What&apos;s included in the export:</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Business profile and settings</li>
                            <li>• All customers and their information</li>
                            <li>• Complete invoice history</li>
                            <li>• All transactions and categories</li>
                            <li>• Chart of accounts data</li>
                            <li>• Export metadata and timestamps</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Data Backup */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Data Backup
                        </CardTitle>
                        <CardDescription>Automated backup and data protection</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <Shield className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">Automated Backups</h3>
                              <p className="text-sm text-muted-foreground">Daily automated backups to cloud storage</p>
                            </div>
                          </div>
                          <Button variant="outline" disabled>
                            <span className="text-muted-foreground">Coming Soon</span>
                          </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <Shield className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">Backup History</h3>
                              <p className="text-sm text-muted-foreground">View and restore from previous backups</p>
                            </div>
                          </div>
                          <Button variant="outline" disabled>
                            <span className="text-muted-foreground">Coming Soon</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Data Import */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Download className="h-5 w-5" />
                          Data Import
                        </CardTitle>
                        <CardDescription>Import data from other systems or previous exports</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                              <Download className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">CSV Import</h3>
                              <p className="text-sm text-muted-foreground">Import customers, invoices, or transactions from CSV</p>
                            </div>
                          </div>
                          <Button variant="outline" disabled>
                            <span className="text-muted-foreground">Coming Soon</span>
                          </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                              <Download className="h-5 w-5 text-cyan-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">Excel Import</h3>
                              <p className="text-sm text-muted-foreground">Import data from Excel spreadsheets</p>
                            </div>
                          </div>
                          <Button variant="outline" disabled>
                            <span className="text-muted-foreground">Coming Soon</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Data Cleanup */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <SettingsIcon className="h-5 w-5" />
                          Data Cleanup
                        </CardTitle>
                        <CardDescription>Maintain and optimize your data</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                              <SettingsIcon className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">Duplicate Detection</h3>
                              <p className="text-sm text-muted-foreground">Find and merge duplicate customers or invoices</p>
                            </div>
                          </div>
                          <Button variant="outline" disabled>
                            <span className="text-muted-foreground">Coming Soon</span>
                          </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              <SettingsIcon className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">Data Validation</h3>
                              <p className="text-sm text-muted-foreground">Check for data inconsistencies and errors</p>
                            </div>
                          </div>
                          <Button variant="outline" disabled>
                            <span className="text-muted-foreground">Coming Soon</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Account Deletion */}
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                          <Trash2 className="h-5 w-5" />
                          Account Deletion
                        </CardTitle>
                        <CardDescription className="text-red-600">Permanently delete your account and all data</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="bg-red-50 p-4 rounded-lg">
                          <h4 className="font-medium text-red-900 mb-2">⚠️ Warning: This action cannot be undone</h4>
                          <p className="text-sm text-red-800 mb-3">
                            Deleting your account will permanently remove all your business data, including:
                          </p>
                          <ul className="text-sm text-red-800 space-y-1">
                            <li>• All customer information</li>
                            <li>• Complete invoice and transaction history</li>
                            <li>• Business settings and preferences</li>
                            <li>• All reports and analytics data</li>
                            <li>• Account access and permissions</li>
                          </ul>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              <Trash2 className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-red-900">Delete Account</h3>
                              <p className="text-sm text-red-700">This action is permanent and irreversible</p>
                            </div>
                          </div>
                          <Button 
                            variant="destructive" 
                            onClick={handleDeleteAccount}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
