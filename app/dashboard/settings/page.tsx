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
  fiscal_year_start: string;
  default_currency: string;
  tax_rate: number;
  invoice_prefix: string;
  invoice_numbering: 'sequential' | 'date_based';
}

export default function SettingsPage() {
  const { preferences, updatePreferences } = usePreferences();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
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
    fiscal_year_start: '01-01',
    default_currency: 'USD',
    tax_rate: 0,
    invoice_prefix: 'INV',
    invoice_numbering: 'sequential'
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

      // Fetch accounting settings (you might want to create an accounting_settings table)
      const savedAccounting = localStorage.getItem('accountingSettings');
      if (savedAccounting) {
        setAccountingSettings(JSON.parse(savedAccounting));
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

  const handleSaveUserPreferences = () => {
    // Request notification permissions if enabled
    if (preferences.notifications.push) {
      requestNotificationPermission();
    }
    
    toast.success('User preferences saved');
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
        updatePreferences({
          notifications: { ...preferences.notifications, push: false }
        });
      }
    } else {
      toast.error('This browser does not support notifications');
      updatePreferences({
        notifications: { ...preferences.notifications, push: false }
      });
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

  const handleSaveAccountingSettings = () => {
    localStorage.setItem('accountingSettings', JSON.stringify(accountingSettings));
    toast.success('Accounting settings saved');
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const supabase = createClient();
      
      // Get all business data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businesses } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (!businesses) return;

      // Export all data (simplified - you might want to create a proper export function)
      const exportData = {
        business: businesses,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
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
                                timeZone: preferences.timezone,
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </Label>
                          <select
                            title="Timezone"
                            value={preferences.timezone}
                            onChange={(e) => updatePreferences({ timezone: e.target.value })}
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
                            value={preferences.currency}
                            onChange={(e) => updatePreferences({ currency: e.target.value })}
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
                              checked={preferences.notifications.email}
                              onCheckedChange={(checked: boolean) => updatePreferences({
                                notifications: { ...preferences.notifications, email: checked }
                              })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Push Notifications</Label>
                              <p className="text-sm text-muted-foreground">Receive browser notifications</p>
                            </div>
                            <Switch
                              checked={preferences.notifications.push}
                              onCheckedChange={(checked: boolean) => updatePreferences({
                                notifications: { ...preferences.notifications, push: checked }
                              })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>SMS Notifications</Label>
                              <p className="text-sm text-muted-foreground">Receive text messages</p>
                            </div>
                            <Switch
                              checked={preferences.notifications.sms}
                              onCheckedChange={(checked: boolean) => updatePreferences({
                                notifications: { ...preferences.notifications, sms: checked }
                              })}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <Button onClick={handleSaveUserPreferences}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Preferences
                        </Button>
                        {preferences.notifications.push && (
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Accounting Settings</CardTitle>
                      <CardDescription>Configure your accounting preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Fiscal Year Start</Label>
                          <Input
                            type="date"
                            value={`2024-${accountingSettings.fiscal_year_start}`}
                            onChange={(e) => setAccountingSettings(prev => ({
                              ...prev,
                              fiscal_year_start: e.target.value.slice(5)
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
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="CAD">CAD - Canadian Dollar</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Tax Rate (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={accountingSettings.tax_rate}
                            onChange={(e) => setAccountingSettings(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Invoice Prefix</Label>
                          <Input
                            value={accountingSettings.invoice_prefix}
                            onChange={(e) => setAccountingSettings(prev => ({ ...prev, invoice_prefix: e.target.value }))}
                            placeholder="INV"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Invoice Numbering</Label>
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

                      <Button onClick={handleSaveAccountingSettings}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Accounting Settings
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Security Settings</CardTitle>
                      <CardDescription>Manage your account security</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Change Password</h3>
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
                          </div>
                        </div>
                        <Button onClick={handleChangePassword} disabled={isSaving}>
                          <Shield className="h-4 w-4 mr-2" />
                          {isSaving ? 'Updating...' : 'Update Password'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Data Management Tab */}
                {activeTab === 'data' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Data Management</CardTitle>
                      <CardDescription>Manage your business data</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h3 className="font-medium">Export Data</h3>
                            <p className="text-sm text-muted-foreground">Download all your business data as JSON</p>
                          </div>
                          <Button onClick={handleExportData} variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export Data
                          </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h3 className="font-medium">Delete Account</h3>
                            <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                          </div>
                          <Button variant="destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
