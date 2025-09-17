"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";
import { ArrowLeft, Save, X, Trash2, 
    // DollarSign, Calendar, User, CreditCard, Receipt, 
    Loader } from "lucide-react";
import Link from "next/link";

export default function EditTransactionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<{
    id: string;
    business_id: string;
    customer_id?: string;
    transaction_number: string;
    type: string;
    amount: number;
    description?: string;
    status: string;
    payment_method?: string;
    notes?: string;
    transaction_date: string;
    created_at: string;
    updated_at: string;
    customer?: {
      id: string;
      name: string;
      email?: string;
    };
  } | null>(null);
  const [customers, setCustomers] = useState<Array<{id: string; name: string; email?: string}>>([]);
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false
  });
  const router = useRouter();
  const params = useParams();
  const transactionId = params.id as string;

  const [formData, setFormData] = useState({
    customer_id: "",
    type: "sale",
    amount: "",
    description: "",
    status: "completed",
    payment_method: "cash",
    notes: "",
    transaction_date: ""
  });

  useEffect(() => {
    const fetchTransaction = async () => {
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

        // Get transaction
        const { data: transactionData, error } = await supabase
          .from('transactions')
          .select(`
            *,
            customer:customers(id, name, email)
          `)
          .eq('id', transactionId)
          .eq('business_id', businesses.id)
          .single();

        if (error) {
          setError("Transaction not found");
          return;
        }

        setTransaction(transactionData);
        setFormData({
          customer_id: transactionData.customer_id || "",
          type: transactionData.type,
          amount: transactionData.amount.toString(),
          description: transactionData.description || "",
          status: transactionData.status,
          payment_method: transactionData.payment_method || "cash",
          notes: transactionData.notes || "",
          transaction_date: transactionData.transaction_date.split('T')[0]
        });

        // Fetch customers for dropdown
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name, email')
          .eq('business_id', businesses.id)
          .order('name');

        setCustomers(customersData || []);
      } catch (error) {
        console.error('Error fetching transaction:', error);
        setError("Failed to load transaction");
      }
    };

    fetchTransaction();
  }, [transactionId]);

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
      
      // Update transaction
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          customer_id: formData.customer_id || null,
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description || null,
          status: formData.status,
          payment_method: formData.payment_method || null,
          notes: formData.notes || null,
          transaction_date: formData.transaction_date,
        })
        .eq('id', transactionId);

      if (updateError) {
        throw updateError;
      }

      toast.success(`Transaction ${transaction?.transaction_number} has been updated successfully.`);
      // Redirect to transactions list
      router.push("/dashboard/transactions");
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update transaction");
      setError(error instanceof Error ? error.message : "Failed to update transaction");
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
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (deleteError) {
        throw deleteError;
      }

      toast.success(`Transaction ${transaction?.transaction_number} has been deleted successfully.`);
      // Redirect to transactions list
      router.push("/dashboard/transactions");
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error(error instanceof Error ? error.message : "Failed to delete transaction");
      setError(error instanceof Error ? error.message : "Failed to delete transaction");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'refunded':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (!transaction) {
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
                <Link href="/dashboard/transactions">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Link>
              </Button>
              <div className="flex items-center space-x-4">
                <p className="text-sm text-muted-foreground">
                  Update {transaction.transaction_number}
                </p>
                <Badge className={`capitalize ${getStatusColor(transaction.status)}`}>
                  {transaction.status}
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Transaction Information</h3>
                <div className="grid gap-6 md:grid-cols-2 w-full">
                  <div className="space-y-2">
                    <label htmlFor="transaction_number" className="block text-sm font-medium text-muted-foreground">
                      Transaction Number
                    </label>
                    <input
                      id="transaction_number"
                      type="text"
                      value={transaction.transaction_number}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm shadow-sm bg-gray-50 cursor-not-allowed"
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="type" className="block text-sm font-medium text-muted-foreground">
                      Transaction Type
                    </label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => handleInputChange("type", e.target.value)}
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    >
                      <option value="sale">Sale</option>
                      <option value="service">Service</option>
                      <option value="refund">Refund</option>
                      <option value="payment">Payment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Amount and Status */}
              <div className="bg-white dark:bg-gray-900 rounded-sm border border-brand-snowman p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Amount & Status</h3>
                <div className="grid gap-6 md:grid-cols-2 w-full">
                  <div className="space-y-2">
                    <label htmlFor="amount" className="block text-sm font-medium text-muted-foreground">
                      Amount *
                    </label>
                    <input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => handleInputChange("amount", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="status" className="block text-sm font-medium text-muted-foreground">
                      Status
                    </label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => handleInputChange("status", e.target.value)}
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    >
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer and Payment */}
              <div className="bg-white dark:bg-gray-900 rounded-sm border border-brand-snowman p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Customer & Payment</h3>
                <div className="grid gap-6 md:grid-cols-2 w-full">
                  <div className="space-y-2">
                    <label htmlFor="customer_id" className="block text-sm font-medium text-muted-foreground">
                      Customer
                    </label>
                    <select
                      id="customer_id"
                      value={formData.customer_id}
                      onChange={(e) => handleInputChange("customer_id", e.target.value)}
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    >
                      <option value="">No Customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} {customer.email && `(${customer.email})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="payment_method" className="block text-sm font-medium text-muted-foreground">
                      Payment Method
                    </label>
                    <select
                      id="payment_method"
                      value={formData.payment_method}
                      onChange={(e) => handleInputChange("payment_method", e.target.value)}
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Description and Date */}
              <div className="bg-white dark:bg-gray-900 rounded-sm border border-brand-snowman p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Details</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="description" className="block text-sm font-medium text-muted-foreground">
                      Description
                    </label>
                    <input
                      id="description"
                      type="text"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Transaction description..."
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="transaction_date" className="block text-sm font-medium text-muted-foreground">
                      Transaction Date
                    </label>
                    <input
                      id="transaction_date"
                      type="date"
                      value={formData.transaction_date}
                      onChange={(e) => handleInputChange("transaction_date", e.target.value)}
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
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
                    placeholder="Any additional notes about this transaction..."
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
                  {isDeleting ? "Deleting..." : "Delete Transaction"}
                </Button>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
                    <Link href="/dashboard/transactions">
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
        title="Delete Transaction"
        description={`Are you sure you want to delete transaction ${transaction?.transaction_number}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
