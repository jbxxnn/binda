"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Edit, 
  // MoreVertical, 
  Phone, Mail, MapPin, Calendar, User, Building2, Trash2, 
  FileText, DollarSign, CreditCard, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { usePreferences } from "@/lib/contexts/preferences-context";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

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
  avatar_url?: string;
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

interface CustomerDrawerProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (customerId: string, customerName: string) => void;
}

export function CustomerDrawer({ customer, isOpen, onClose, onDelete }: CustomerDrawerProps) {
  const { formatCurrency, formatDate } = usePreferences();
  const [activeTab, setActiveTab] = useState<'basic' | 'subscription' | 'activities' | 'tasks'>('basic');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Fetch activities when activities tab is selected
  useEffect(() => {
    if (activeTab === 'activities' && customer) {
      fetchActivities();
    }
  }, [activeTab, customer]);

  if (!customer) return null;

  // const getInitials = (name: string) => {
  //   return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  // };


  const formatActivityDate = (dateString: string) => {
    return formatDate(dateString, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch customer activities
  const fetchActivities = async () => {
    if (!customer) return;
    
    setIsLoadingActivities(true);
    try {
      const supabase = createClient();
      const activitiesList: Activity[] = [];

      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, status, created_at, invoice_date')
        .eq('customer_id', customer.id)
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
        .eq('invoice.customer_id', customer.id)
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
        .eq('customer_id', customer.id)
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
      
      setActivities(activitiesList.slice(0, 20)); // Limit to 20 most recent activities
    } catch (error) {
      console.error('Error fetching customer activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 200,
              duration: 0.3
            }}
            className="fixed right-0 top-0 h-full w-[90%] sm:w-96 z-50 bg-white dark:bg-gray-900 shadow-2xl flex flex-col"
          >
            {/* Header */}
            {/* <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
              <button 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div> */}

            {/* Profile Section */}
            <div className="relative p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <ProfileAvatar 
                    src={customer.avatar_url}
                    alt={customer.name}
                    name={customer.name}
                    size="xl"
                    className="w-16 h-16"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {customer.name}
                    </h2>
                    <button 
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      aria-label="Edit customer name"
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                onClick={onClose}
                className="absolute -left-6 top-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-10"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {customer.customer_type === "business" ? "Business Customer" : "Individual Customer"}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button 
                  onClick={() => setActiveTab('basic')}
                  className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'basic' 
                      ? 'text-gray-900 dark:text-white border-teal-500' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent'
                  }`}
                >
                  Basic Information
                </button>
                <button 
                  onClick={() => setActiveTab('subscription')}
                  className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'subscription' 
                      ? 'text-gray-900 dark:text-white border-teal-500' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent'
                  }`}
                >
                  Subscription
                </button>
                <button 
                  onClick={() => setActiveTab('activities')}
                  className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'activities' 
                      ? 'text-gray-900 dark:text-white border-teal-500' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent'
                  }`}
                >
                  Activities
                </button>
                <button 
                  onClick={() => setActiveTab('tasks')}
                  className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'tasks' 
                      ? 'text-gray-900 dark:text-white border-teal-500' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent'
                  }`}
                >
                  Tasks
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  {/* Contact Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                    <div className="space-y-3">
                      {customer.email && (
                        <div className="flex items-center space-x-3">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center space-x-3">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">{customer.phone}</span>
                        </div>
                      )}
                      {(customer.city || customer.state) && (
                        <div className="flex items-center space-x-3">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {customer.city && customer.state 
                              ? `${customer.city}, ${customer.state}` 
                              : customer.city || customer.state || 'Not specified'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Type */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Customer Type</h3>
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

                  {/* Created Date */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Member Since</h3>
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(customer.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {customer.notes && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Notes</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        {customer.notes}
                      </p>
                    </div>
                  )}

                  {/* Address */}
                  {customer.address && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Address</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <p>{customer.address}</p>
                        {customer.city && customer.state && (
                          <p>{customer.city}, {customer.state} {customer.zip_code}</p>
                        )}
                        {customer.country && <p>{customer.country}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}


              {activeTab === 'subscription' && (
                <div className="space-y-6">
                  {customer.subscription_status === 'none' || !customer.subscription_status ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No active subscription</p>
                      <p className="text-sm mt-2">This customer doesn&apos;t have a subscription plan</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Subscription Status */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Subscription Status</h3>
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
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Plan Details</h3>
                          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                {customer.subscription_plan}
                              </span>
                              {customer.subscription_amount && (
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(customer.subscription_amount)}
                                </span>
                              )}
                            </div>
                            {customer.subscription_interval && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                                Billed {customer.subscription_interval}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Billing Information */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Billing Information</h3>
                        <div className="space-y-3">
                          {customer.subscription_start_date && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-300">Start Date</span>
                              <span className="text-sm text-gray-900 dark:text-white">
                                {formatDate(customer.subscription_start_date)}
                              </span>
                            </div>
                          )}
                          {customer.subscription_next_billing_date && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-300">Next Billing</span>
                              <span className="text-sm text-gray-900 dark:text-white">
                                {formatDate(customer.subscription_next_billing_date)}
                              </span>
                            </div>
                          )}
                          {customer.subscription_end_date && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-300">End Date</span>
                              <span className="text-sm text-gray-900 dark:text-white">
                                {formatDate(customer.subscription_end_date)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Subscription Notes */}
                      {customer.subscription_notes && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Subscription Notes</h3>
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {customer.subscription_notes}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="outline" size="sm" className="text-xs">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit Plan
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs">
                            <CreditCard className="h-3 w-3 mr-1" />
                            View Billing
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activities' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activities</h3>
                    <Badge variant="outline" className="text-xs">
                      {activities.length} activities
                    </Badge>
                  </div>
                  
                  {isLoadingActivities ? (
                    <div className="flex items-center justify-center py-8">
                      <Clock className="h-6 w-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Loading activities...</span>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No activities found for this customer</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity) => {
                        const IconComponent = activity.icon;
                        return (
                          <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
                                <IconComponent className="h-4 w-4 text-teal-600 dark:text-teal-300" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {activity.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatActivityDate(activity.date)}
                                </p>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {activity.description}
                              </p>
                              {activity.amount && (
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
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
                </div>
              )}

              {activeTab === 'tasks' && (
                <div className="space-y-6">
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Task management features coming soon</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href={`/dashboard/customers/${customer.id}`}>
                    <User className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <Link href={`/dashboard/customers/${customer.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Customer
                  </Link>
                </Button>
                {onDelete && (
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => onDelete(customer.id, customer.name)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
