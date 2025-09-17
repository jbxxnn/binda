"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";
import { ArrowLeft, Save, X, Trash2, User, Building2, Loader } from "lucide-react";
import Link from "next/link";

export default function EditCustomerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<{
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
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false
  });
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
    customer_type: "individual",
    notes: "",
  });

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const supabase = createClient();
        
        // Get current user and business
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: businesses } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (!businesses) return;

        // Get customer
        const { data: customerData, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .eq('business_id', businesses.id)
          .single();

        if (error) {
          setError("Customer not found");
          return;
        }

        setCustomer(customerData);
        setFormData({
          name: customerData.name || "",
          email: customerData.email || "",
          phone: customerData.phone || "",
          address: customerData.address || "",
          city: customerData.city || "",
          state: customerData.state || "",
          zip_code: customerData.zip_code || "",
          country: customerData.country || "",
          customer_type: customerData.customer_type || "individual",
          notes: customerData.notes || "",
        });
      } catch (error) {
        console.error('Error fetching customer:', error);
        setError("Failed to load customer");
      }
    };

    fetchCustomer();
  }, [customerId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Update customer
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zip_code || null,
          country: formData.country || null,
          customer_type: formData.customer_type,
          notes: formData.notes || null,
        })
        .eq('id', customerId);

      if (updateError) {
        throw updateError;
      }

      toast.success(`${formData.name} has been updated successfully.`);
      // Redirect to customers list
      router.push("/dashboard/customers");
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update customer");
      setError(error instanceof Error ? error.message : "Failed to update customer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialog({ isOpen: true });
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const supabase = createClient();
      
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (deleteError) {
        throw deleteError;
      }

      toast.success(`${customer?.name || 'Customer'} has been deleted successfully.`);
      // Redirect to customers list
      router.push("/dashboard/customers");
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error(error instanceof Error ? error.message : "Failed to delete customer");
      setError(error instanceof Error ? error.message : "Failed to delete customer");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false });
  };

  if (!customer) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <Loader className="h-4 w-4 animate-spin" />
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
                <Link href="/dashboard/customers">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Link>
              </Button>
              <div className="flex items-center space-x-4">
                {/* <h1 className="text-2xl font-medium">Edit Customer</h1> */}
                <p className="text-sm text-muted-foreground">
                  Update {customer.name}&apos;s information
                </p>
                <Badge variant="outline" className="capitalize">
                {customer.customer_type === "business" ? (
                  <>
                    <Building2 className="w-3 h-3 mr-1" />
                    Business
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3 mr-1" />
                    Individual
                  </>
                )}
              </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto p-6 w-full max-w-full">
          <div className="max-w-4xl mx-auto w-full max-w-full min-w-0">
            <form onSubmit={handleSubmit} className="space-y-8 w-full max-w-full">
              {/* Basic Information */}
              <div className="bg-white dark:bg-gray-900 rounded-sm border border-brand-snowman p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Basic Information</h3>
                <div className="grid gap-6 md:grid-cols-2 w-full">
                  <div className="space-y-2">
                    <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
                      Full Name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="customer_type" className="block text-sm font-medium text-muted-foreground">
                      Customer Type
                    </label>
                    <select
                      id="customer_type"
                      value={formData.customer_type}
                      onChange={(e) => handleInputChange("customer_type", e.target.value)}
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    >
                      <option value="individual">Individual</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white dark:bg-gray-900 rounded-sm border border-brand-snowman p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Contact Information</h3>
                <div className="grid gap-6 md:grid-cols-2 w-full">
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground">
                      Phone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-white dark:bg-gray-900 rounded-sm border border-brand-snowman p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Address Information</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="address" className="block text-sm font-medium text-muted-foreground">
                      Street Address
                    </label>
                    <input
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="123 Main Street"
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    />
                  </div>
                  <div className="grid gap-6 md:grid-cols-3 w-full">
                    <div className="space-y-2">
                      <label htmlFor="city" className="block text-sm font-medium text-muted-foreground">
                        City
                      </label>
                      <input
                        id="city"
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                        placeholder="New York"
                        className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="state" className="block text-sm font-medium text-muted-foreground">
                        State
                      </label>
                      <input
                        id="state"
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                        placeholder="NY"
                        className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="zip_code" className="block text-sm font-medium text-muted-foreground">
                        ZIP Code
                      </label>
                      <input
                        id="zip_code"
                        type="text"
                        value={formData.zip_code}
                        onChange={(e) => handleInputChange("zip_code", e.target.value)}
                        placeholder="10001"
                        className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="country" className="block text-sm font-medium text-muted-foreground">
                      Country
                    </label>
                    <input
                      id="country"
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      placeholder="United States"
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white dark:bg-gray-900 rounded-sm border border-brand-snowman p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Additional Information</h3>
                <div className="space-y-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Any additional notes about this customer..."
                    rows={4}
                    className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-6 gap-4">
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-sm w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? "Deleting..." : "Delete Customer"}
                </Button>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
                    <Link href="/dashboard/customers">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Link>
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-sm w-full sm:w-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer"
        description={`Are you sure you want to delete ${customer?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

