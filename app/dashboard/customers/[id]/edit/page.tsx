"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePreferences } from "@/lib/contexts/preferences-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  User,
  Building2,
  CreditCard,
  // Calendar,
  MessageCircle,
  Mail,
  // Phone,
  MapPin
} from "lucide-react";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  customer_type?: string;
  notes?: string;
  created_at: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  // Subscription fields
  subscription_status?: 'none' | 'active' | 'paused' | 'cancelled' | 'expired';
  subscription_plan?: string;
  subscription_amount?: number;
  subscription_currency?: string;
  subscription_interval?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  subscription_start_date?: string;
  subscription_end_date?: string;
  subscription_next_billing_date?: string;
  subscription_auto_renew?: boolean;
  subscription_notes?: string;
}

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const { formatCurrency, formatDate } = usePreferences(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    customer_type: "individual" as "individual" | "business",
    notes: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
    // Subscription fields
    subscription_status: "none" as "none" | "active" | "paused" | "cancelled" | "expired",
    subscription_plan: "",
    subscription_amount: 0,
    subscription_currency: "USD",
    subscription_interval: "monthly" as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
    subscription_start_date: "",
    subscription_end_date: "",
    subscription_next_billing_date: "",
    subscription_auto_renew: false,
    subscription_notes: ""
  });

  const customerId = params.id as string;

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      const supabase = createClient();
      
      const { data: customerData, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) {
        console.error('Error fetching customer:', error);
        toast.error('Failed to load customer details');
        return;
      }

      setCustomer(customerData);
      
      // Populate form data
      setFormData({
        name: customerData.name || "",
        email: customerData.email || "",
        phone: customerData.phone || "",
        customer_type: customerData.customer_type || "individual",
        notes: customerData.notes || "",
        address: customerData.address || "",
        city: customerData.city || "",
        state: customerData.state || "",
        zip_code: customerData.zip_code || "",
        country: customerData.country || "",
        // Subscription fields
        subscription_status: customerData.subscription_status || "none",
        subscription_plan: customerData.subscription_plan || "",
        subscription_amount: customerData.subscription_amount || 0,
        subscription_currency: customerData.subscription_currency || "USD",
        subscription_interval: customerData.subscription_interval || "monthly",
        subscription_start_date: customerData.subscription_start_date || "",
        subscription_end_date: customerData.subscription_end_date || "",
        subscription_next_billing_date: customerData.subscription_next_billing_date || "",
        subscription_auto_renew: customerData.subscription_auto_renew || false,
        subscription_notes: customerData.subscription_notes || ""
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error('Failed to load customer details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('customers')
        .update({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          customer_type: formData.customer_type,
          notes: formData.notes.trim() || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          zip_code: formData.zip_code.trim() || null,
          country: formData.country.trim() || null,
          // Subscription fields
          subscription_status: formData.subscription_status,
          subscription_plan: formData.subscription_plan.trim() || null,
          subscription_amount: formData.subscription_amount || null,
          subscription_currency: formData.subscription_currency,
          subscription_interval: formData.subscription_interval,
          subscription_start_date: formData.subscription_start_date || null,
          subscription_end_date: formData.subscription_end_date || null,
          subscription_next_billing_date: formData.subscription_next_billing_date || null,
          subscription_auto_renew: formData.subscription_auto_renew,
          subscription_notes: formData.subscription_notes.trim() || null
        })
        .eq('id', customerId);

      if (error) {
        console.error('Error updating customer:', error);
        toast.error('Failed to update customer. Please try again.');
        return;
      }

      toast.success('Customer updated successfully!');
      router.push(`/dashboard/customers/${customerId}`);

    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateForInput = (dateString: string) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!dateString) return "";
    return new Date(dateString).toISOString().split('T')[0];
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Not Found</h2>
          <p className="text-gray-600 mb-4">The customer you&apos;re looking for doesn&apos;t exist.</p>
          <Button asChild>
            <Link href="/dashboard/customers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full relative w-full max-w-full overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full max-w-full min-w-0">
        {/* Page Header */}
        <div className="px-6 py-4 border-b bg-brand-lightning">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/customers/${customerId}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-medium">Edit Customer</h1>
                <p className="text-sm text-gray-600">Update customer information and subscription details</p>
              </div>
            </div>
            <Button 
              onClick={handleSubmit}
              disabled={isSaving}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Basic Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Name */}
                    <div className="md:col-span-2">
                      <Label htmlFor="name" className="text-sm font-medium">
                        Customer Name *
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter customer name"
                        required
                        className="mt-1"
                      />
                    </div>

                    {/* Customer Type */}
                    <div>
                      <Label className="text-sm font-medium">Customer Type</Label>
                      <div className="mt-2 space-y-2">
                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="customer_type"
                            value="individual"
                            checked={formData.customer_type === "individual"}
                            onChange={(e) => handleInputChange('customer_type', e.target.value)}
                            className="h-4 w-4 text-teal-600"
                          />
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">Individual</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="customer_type"
                            value="business"
                            checked={formData.customer_type === "business"}
                            onChange={(e) => handleInputChange('customer_type', e.target.value)}
                            className="h-4 w-4 text-teal-600"
                          />
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">Business</span>
                        </label>
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">
                        <Mail className="h-4 w-4 inline mr-1" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="customer@example.com"
                        className="mt-1"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium">
                        <MessageCircle className="h-4 w-4 inline mr-1" />
                        WhatsApp Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+1234567890"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Include country code (e.g., +1234567890)
                      </p>
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2">
                      <Label htmlFor="address" className="text-sm font-medium">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Address
                      </Label>
                      <Input
                        id="address"
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Street address"
                        className="mt-1"
                      />
                    </div>

                    {/* City, State, Zip */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2">
                      <div>
                        <Label htmlFor="city" className="text-sm font-medium">City</Label>
                        <Input
                          id="city"
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          placeholder="City"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state" className="text-sm font-medium">State</Label>
                        <Input
                          id="state"
                          type="text"
                          value={formData.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          placeholder="State"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zip_code" className="text-sm font-medium">ZIP Code</Label>
                        <Input
                          id="zip_code"
                          type="text"
                          value={formData.zip_code}
                          onChange={(e) => handleInputChange('zip_code', e.target.value)}
                          placeholder="ZIP Code"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Country */}
                    <div className="md:col-span-2">
                      <Label htmlFor="country" className="text-sm font-medium">Country</Label>
                      <Input
                        id="country"
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        placeholder="Country"
                        className="mt-1"
                      />
                    </div>

                    {/* Notes */}
                    <div className="md:col-span-2">
                      <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Additional notes about this customer"
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Information */}
              <Card id="subscription">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Subscription Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Subscription Status */}
                  <div>
                    <Label className="text-sm font-medium">Subscription Status</Label>
                    <select
                      value={formData.subscription_status}
                      onChange={(e) => handleInputChange('subscription_status', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                      aria-label="Select subscription status"
                    >
                      <option value="none">No Subscription</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>

                  {/* Show subscription fields only if not "none" */}
                  {formData.subscription_status !== 'none' && (
                    <>
                      <Separator />
                      
                      {/* Plan Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="subscription_plan" className="text-sm font-medium">
                            Plan Name
                          </Label>
                          <Input
                            id="subscription_plan"
                            type="text"
                            value={formData.subscription_plan}
                            onChange={(e) => handleInputChange('subscription_plan', e.target.value)}
                            placeholder="e.g., Basic Plan, Premium Plan"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="subscription_amount" className="text-sm font-medium">
                            Amount ({formData.subscription_currency})
                          </Label>
                          <Input
                            id="subscription_amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.subscription_amount}
                            onChange={(e) => handleInputChange('subscription_amount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="subscription_currency" className="text-sm font-medium">
                            Currency
                          </Label>
                          <select
                            id="subscription_currency"
                            value={formData.subscription_currency}
                            onChange={(e) => handleInputChange('subscription_currency', e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            aria-label="Select subscription currency"
                          >
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="NGN">NGN - Nigerian Naira</option>
                            <option value="ZAR">ZAR - South African Rand</option>
                            <option value="KES">KES - Kenyan Shilling</option>
                            <option value="GHS">GHS - Ghanaian Cedi</option>
                          </select>
                        </div>

                        <div>
                          <Label htmlFor="subscription_interval" className="text-sm font-medium">
                            Billing Interval
                          </Label>
                          <select
                            id="subscription_interval"
                            value={formData.subscription_interval}
                            onChange={(e) => handleInputChange('subscription_interval', e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            aria-label="Select billing interval"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>
                      </div>

                      {/* Billing Dates */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Billing Dates</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="subscription_start_date" className="text-sm font-medium">
                              Start Date
                            </Label>
                            <Input
                              id="subscription_start_date"
                              type="date"
                              value={formData.subscription_start_date}
                              onChange={(e) => handleInputChange('subscription_start_date', e.target.value)}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="subscription_next_billing_date" className="text-sm font-medium">
                              Next Billing Date
                            </Label>
                            <Input
                              id="subscription_next_billing_date"
                              type="date"
                              value={formData.subscription_next_billing_date}
                              onChange={(e) => handleInputChange('subscription_next_billing_date', e.target.value)}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="subscription_end_date" className="text-sm font-medium">
                              End Date (Optional)
                            </Label>
                            <Input
                              id="subscription_end_date"
                              type="date"
                              value={formData.subscription_end_date}
                              onChange={(e) => handleInputChange('subscription_end_date', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Auto Renewal */}
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="subscription_auto_renew" className="text-sm font-medium">
                            Auto Renewal
                          </Label>
                          <p className="text-xs text-gray-500">
                            Automatically renew this subscription
                          </p>
                        </div>
                        <Switch
                          id="subscription_auto_renew"
                          checked={formData.subscription_auto_renew}
                          onCheckedChange={(checked) => handleInputChange('subscription_auto_renew', checked)}
                        />
                      </div>

                      {/* Subscription Notes */}
                      <div>
                        <Label htmlFor="subscription_notes" className="text-sm font-medium">
                          Subscription Notes
                        </Label>
                        <Textarea
                          id="subscription_notes"
                          value={formData.subscription_notes}
                          onChange={(e) => handleInputChange('subscription_notes', e.target.value)}
                          placeholder="Additional notes about this subscription"
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}