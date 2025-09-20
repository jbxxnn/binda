"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePreferences } from "@/lib/contexts/preferences-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Building2,
  CreditCard,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  MoreHorizontal,
  Download,
  Share
} from "lucide-react";
import Link from "next/link";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

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

interface Activity {
  id: string;
  type: 'invoice' | 'payment' | 'transaction';
  title: string;
  description: string;
  amount?: number;
  date: string;
  status?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { formatCurrency, formatDate } = usePreferences();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    customerId: string;
    customerName: string;
  }>({
    isOpen: false,
    customerId: "",
    customerName: ""
  });

  const customerId = params.id as string;

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
      fetchActivities();
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
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error('Failed to load customer details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    if (!customerId) return;
    
    setIsLoadingActivities(true);
    try {
      const supabase = createClient();
      const activitiesList: Activity[] = [];

      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, status, created_at, invoice_date')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (invoices) {
        invoices.forEach(invoice => {
          activitiesList.push({
            id: `invoice-${invoice.id}`,
            type: 'invoice',
            title: `Invoice #${invoice.invoice_number}`,
            description: `Invoice created for ${formatCurrency(invoice.total_amount)}`,
            amount: invoice.total_amount,
            date: invoice.created_at,
            status: invoice.status,
            icon: FileText
          });
        });
      }

      // Fetch payments
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          id, amount, payment_date, created_at,
          invoice:invoices!inner(invoice_number)
        `)
        .eq('invoice.customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (payments) {
        payments.forEach(payment => {
          activitiesList.push({
            id: `payment-${payment.id}`,
            type: 'payment',
            title: `Payment Received`,
            description: `Payment of ${formatCurrency(payment.amount)} for Invoice #${payment.invoice?.[0]?.invoice_number || 'Unknown'}`,
            amount: payment.amount,
            date: payment.created_at,
            icon: CreditCard
          });
        });
      }

      // Fetch transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, type, description, amount, transaction_date, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactions) {
        transactions.forEach(transaction => {
          activitiesList.push({
            id: `transaction-${transaction.id}`,
            type: 'transaction',
            title: transaction.type === 'income' ? 'Income Transaction' : 'Expense Transaction',
            description: transaction.description,
            amount: transaction.amount,
            date: transaction.created_at,
            icon: transaction.type === 'income' ? TrendingUp : TrendingDown
          });
        });
      }

      // Sort all activities by date (newest first)
      activitiesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setActivities(activitiesList.slice(0, 20));
    } catch (error) {
      console.error('Error fetching customer activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const handleDeleteClick = () => {
    if (customer) {
      setDeleteDialog({
        isOpen: true,
        customerId: customer.id,
        customerName: customer.name
      });
    }
  };

  const handleDeleteConfirm = async () => {
    const { customerId, customerName } = deleteDialog;
    
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        console.error('Error deleting customer:', error);
        toast.error('Failed to delete customer. Please try again.');
        return;
      }

      toast.success(`${customerName} has been deleted successfully.`);
      router.push('/dashboard/customers');

    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer. Please try again.');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      customerId: "",
      customerName: ""
    });
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const formatActivityDate = (dateString: string) => {
    return formatDate(dateString, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <Clock className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Not Found</h2>
          <p className="text-gray-600 mb-4">The customer you're looking for doesn't exist.</p>
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
                <Link href="/dashboard/customers">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold text-teal-700">
                    {getInitials(customer.name)}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-medium">{customer.name}</h1>
                  <p className="text-sm text-gray-600">
                    {customer.customer_type === "business" ? "Business Customer" : "Individual Customer"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/customers/${customer.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteClick}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
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
                  {/* Contact Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
                    <div className="space-y-3">
                      {customer.email && (
                        <div className="flex items-center space-x-3">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center space-x-3">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{customer.phone}</span>
                        </div>
                      )}
                      {(customer.city || customer.state) && (
                        <div className="flex items-center space-x-3">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {customer.city && customer.state 
                              ? `${customer.city}, ${customer.state}` 
                              : customer.city || customer.state || 'Not specified'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer Details</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Type</span>
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
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Member Since</span>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {formatDate(customer.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address */}
                {customer.address && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Address</h3>
                    <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                      <p>{customer.address}</p>
                      {customer.city && customer.state && (
                        <p>{customer.city}, {customer.state} {customer.zip_code}</p>
                      )}
                      {customer.country && <p>{customer.country}</p>}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {customer.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Notes</h3>
                    <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                      {customer.notes}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscription Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Subscription Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customer.subscription_status === 'none' || !customer.subscription_status ? (
                  <div className="text-center text-gray-500 py-8">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active subscription</p>
                    <p className="text-sm mt-2">This customer doesn't have a subscription plan</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Subscription Status */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Subscription Status</h3>
                      <div className="flex items-center space-x-3">
                        <Badge className={`${
                          customer.subscription_status === 'active' ? 'bg-green-100 text-green-800' :
                          customer.subscription_status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                          customer.subscription_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          customer.subscription_status === 'expired' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        } capitalize`}>
                          {customer.subscription_status}
                        </Badge>
                        {customer.subscription_auto_renew && customer.subscription_status === 'active' && (
                          <Badge variant="outline" className="text-xs">
                            Auto-renewal enabled
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Plan Details */}
                    {customer.subscription_plan && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Plan Details</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-lg font-semibold text-gray-900">
                              {customer.subscription_plan}
                            </span>
                            {customer.subscription_amount && (
                              <span className="text-lg font-semibold text-gray-900">
                                {formatCurrency(customer.subscription_amount)}
                              </span>
                            )}
                          </div>
                          {customer.subscription_interval && (
                            <p className="text-sm text-gray-600 capitalize">
                              Billed {customer.subscription_interval}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Billing Information */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Billing Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {customer.subscription_start_date && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Start Date</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(customer.subscription_start_date)}
                            </p>
                          </div>
                        )}
                        {customer.subscription_next_billing_date && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Next Billing</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(customer.subscription_next_billing_date)}
                            </p>
                          </div>
                        )}
                        {customer.subscription_end_date && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">End Date</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(customer.subscription_end_date)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subscription Notes */}
                    {customer.subscription_notes && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Subscription Notes</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">
                            {customer.subscription_notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Recent Activities</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingActivities ? (
                  <div className="flex items-center justify-center py-8">
                    <Clock className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Loading activities...</span>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No activities found for this customer</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => {
                      const IconComponent = activity.icon;
                      return (
                        <div key={activity.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                              <IconComponent className="h-4 w-4 text-teal-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">
                                {activity.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatActivityDate(activity.date)}
                              </p>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {activity.description}
                            </p>
                            {activity.amount && (
                              <p className="text-sm font-semibold text-gray-900 mt-1">
                                {formatCurrency(activity.amount)}
                              </p>
                            )}
                            {activity.status && (
                              <Badge 
                                variant="outline" 
                                className={`mt-2 text-xs ${
                                  activity.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  activity.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                  activity.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {activity.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer"
        description={`Are you sure you want to delete ${deleteDialog.customerName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
