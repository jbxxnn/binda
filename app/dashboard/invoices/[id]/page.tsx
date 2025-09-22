"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePreferences } from "@/lib/contexts/preferences-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Download,
  Send,
  Save,
  X,
//   FileText,
//   User,
//   Calendar,
//   DollarSign,
  Loader
} from "lucide-react";
import Link from "next/link";
import { pdf } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/invoice-pdf';
import { PaymentHistory } from '@/components/payment-history';

interface Invoice {
  id: string;
  business_id: string;
  customer_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  terms?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  business?: {
    id: string;
    name: string;
  };
}

interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export default function InvoiceDetailPage() {
  const { formatCurrency, formatDate } = usePreferences();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    description: "",
    quantity: 1,
    unit_price: 0
  });
  const [editData, setEditData] = useState({
    customer_id: "",
    invoice_date: "",
    due_date: "",
    tax_rate: 0,
    notes: "",
    terms: "",
    status: "draft" as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  });
  const [customers, setCustomers] = useState<{id: string, name: string}[]>([]);
  
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = params.id as string;

  // Check if edit mode should be opened from query parameter
  useEffect(() => {
    const editParam = searchParams.get('edit');
    if (editParam === 'true') {
      setIsEditing(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const supabase = createClient();
        
        // Get invoice with customer and business details
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select(`
            *,
            customer:customers(id, name, email, phone, address, city, state, zip_code),
            business:businesses(id, name)
          `)
          .eq('id', invoiceId)
          .single();

        if (invoiceError) {
          console.error('Error fetching invoice:', invoiceError);
          toast.error('Invoice not found');
          router.push('/dashboard/invoices');
          return;
        }

        setInvoice(invoiceData);
        setEditData({
          customer_id: invoiceData.customer_id || "",
          invoice_date: invoiceData.invoice_date,
          due_date: invoiceData.due_date || "",
          tax_rate: invoiceData.tax_rate,
          notes: invoiceData.notes || "",
          terms: invoiceData.terms || "",
          status: invoiceData.status
        });

        // Get invoice items
        const { data: itemsData, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('created_at');

        if (itemsError) {
          console.error('Error fetching invoice items:', itemsError);
        } else {
          setInvoiceItems(itemsData || []);
        }

        // Get customers for edit form
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name')
          .eq('business_id', invoiceData.business_id)
          .order('name');

        setCustomers(customersData || []);

      } catch (error) {
        console.error('Error fetching invoice:', error);
        toast.error('Failed to load invoice');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId, router]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const refreshInvoiceData = async () => {
    try {
      const supabase = createClient();
      
      // Refresh invoice data to get updated totals
      const { data: updatedInvoice } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, email, phone, address, city, state, zip_code),
          business:businesses(id, name)
        `)
        .eq('id', invoiceId)
        .single();

      if (updatedInvoice) {
        setInvoice(updatedInvoice);
      }
    } catch (error) {
      console.error('Error refreshing invoice data:', error);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.description || newItem.quantity <= 0 || newItem.unit_price < 0) {
      toast.error('Please fill in all item details correctly');
      return;
    }

    try {
      const supabase = createClient();
      
      const totalPrice = newItem.quantity * newItem.unit_price;
      
      const { data: newItemData, error } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoiceId,
          description: newItem.description,
          quantity: newItem.quantity,
          unit_price: newItem.unit_price,
          total_price: totalPrice,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding item:', error);
        toast.error('Failed to add item');
        return;
      }

      setInvoiceItems(prev => [...prev, newItemData]);
      setNewItem({ description: "", quantity: 1, unit_price: 0 });
      setIsAddingItem(false);
      
      // Refresh invoice data to get updated totals
      await refreshInvoiceData();
      
      toast.success('Item added successfully');

    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('invoice_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Error deleting item:', error);
        toast.error('Failed to delete item');
        return;
      }

      setInvoiceItems(prev => prev.filter(item => item.id !== itemId));
      
      // Refresh invoice data to get updated totals
      await refreshInvoiceData();
      
      toast.success('Item deleted successfully');

    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('invoices')
        .update({
          customer_id: editData.customer_id || null,
          invoice_date: editData.invoice_date,
          due_date: editData.due_date || null,
          tax_rate: editData.tax_rate,
          notes: editData.notes || null,
          terms: editData.terms || null,
          status: editData.status,
        })
        .eq('id', invoiceId);

      if (error) {
        console.error('Error updating invoice:', error);
        toast.error('Failed to update invoice');
        return;
      }

      // Refresh invoice data
      const { data: updatedInvoice } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, email, phone, address, city, state, zip_code),
          business:businesses(id, name)
        `)
        .eq('id', invoiceId)
        .single();

      setInvoice(updatedInvoice);
      setIsEditing(false);
      toast.success('Invoice updated successfully');

    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!invoice) {
      toast.error('Invoice data not available');
      return;
    }

    try {
      toast.info('Generating PDF...');
      
      // Generate PDF blob
      const blob = await pdf(<InvoicePDF invoice={invoice} items={invoiceItems} />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.invoice_number}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const handleSendInvoice = () => {
    // TODO: Implement email/WhatsApp sending
    toast.info('Invoice sending coming soon!');
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Invoice not found</h2>
          <p className="text-gray-600 mt-2">The invoice you&apos;re looking for doesn&apos;t exist.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/invoices">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
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
                <Link href="/dashboard/invoices">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Link>
              </Button>
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-2xl font-medium">{invoice.invoice_number}</h1>
                  <p className="text-sm text-gray-600">
                    Created {formatDate(invoice.created_at)}
                  </p>
                </div>
                <div className="hidden md:block flex items-center space-x-2">
                  <Badge className={`capitalize ${getStatusColor(invoice.status || 'draft')}`}>
                    {invoice.status || 'draft'}
                  </Badge>
                  {!isEditing && (
                    <select
                      title="Update invoice status"
                      value={invoice.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
                        try { 
                          const supabase = createClient();
                          const { error } = await supabase
                            .from('invoices')
                            .update({ status: newStatus })
                            .eq('id', invoiceId);
                          
                          if (error) {
                            console.error('Error updating status:', error);
                            toast.error('Failed to update status');
                          } else {
                            setInvoice(prev => prev ? { ...prev, status: newStatus } : null);
                            toast.success('Status updated successfully');
                          }
                        } catch (error) {
                          console.error('Error updating status:', error);
                          toast.error('Failed to update status');
                        }
                      }}
                      className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2">
              {!isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" onClick={handleGeneratePDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button onClick={handleSendInvoice}>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveChanges} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 overflow-auto p-6 w-full max-w-full">
        <div className="block md:hidden flex items-center space-x-2">
                  <Badge className={`capitalize ${getStatusColor(invoice.status || 'draft')}`}>
                    {invoice.status || 'draft'}
                  </Badge>
                  {!isEditing && (
                    <select
                      title="Update invoice status"
                      value={invoice.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
                        try {
                          const supabase = createClient();
                          const { error } = await supabase
                            .from('invoices')
                            .update({ status: newStatus })
                            .eq('id', invoiceId);
                          
                          if (error) {
                            console.error('Error updating status:', error);
                            toast.error('Failed to update status');
                          } else {
                            setInvoice(prev => prev ? { ...prev, status: newStatus } : null);
                            toast.success('Status updated successfully');
                          }
                        } catch (error) {
                          console.error('Error updating status:', error);
                          toast.error('Failed to update status');
                        }
                      }}
                      className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  )}
                </div>
        <div className="block md:hidden flex items-center space-x-2 mb-4 ">
              {!isEditing ? (
                <div className="flex flex-col space-x-2">
                  <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" onClick={handleGeneratePDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  </div>
                  <Button onClick={handleSendInvoice}>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveChanges} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}
          </div>
          <div className="max-w-4xl mx-auto w-full max-w-full min-w-0">
            {/* Invoice Header */}
            <div className="bg-brand-snowman dark:bg-gray-900 rounded-sm border border-brand-tropical p-6 mb-6">
            
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Business Info */}
                <div>
                  <h2 className="text-xl text-gray-900 mb-2">
                    {invoice.business?.name || 'Your Business'}
                  </h2>
                  <p className="text-gray-600">Business Address</p>
                  <p className="text-gray-600">City, State ZIP</p>
                  <p className="text-gray-600">Phone: (555) 123-4567</p>
                  <p className="text-gray-600">Email: business@example.com</p>
                </div>

                {/* Invoice Details */}
                <div className="text-right">
                  <h1 className="text-2xl text-gray-900 mb-4">INVOICE</h1>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice #:</span>
                      <span className="font-medium">{invoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>{formatDate(invoice.invoice_date)}</span>
                    </div>
                    {invoice.due_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Due Date:</span>
                        <span>{formatDate(invoice.due_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              {invoice.customer && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg text-gray-900 mb-2">Bill To:</h3>
                  <div className="text-gray-600">
                    <p className="font-medium">{invoice.customer.name}</p>
                    {invoice.customer.email && <p>{invoice.customer.email}</p>}
                    {invoice.customer.phone && <p>{invoice.customer.phone}</p>}
                    {invoice.customer.address && <p>{invoice.customer.address}</p>}
                    {(invoice.customer.city || invoice.customer.state || invoice.customer.zip_code) && (
                      <p>
                        {[invoice.customer.city, invoice.customer.state, invoice.customer.zip_code]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Edit Invoice Form */}
            {isEditing && (
              <div className="bg-brand-snowman dark:bg-gray-900 rounded-sm border border-brand-tropical p-6 mb-6">
                <h3 className="text-lg text-gray-900 mb-4">Edit Invoice Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer
                      </label>
                      <select
                        value={editData.customer_id}
                        title="Customer"
                        onChange={(e) => setEditData(prev => ({ ...prev, customer_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No customer</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Invoice Date
                      </label>
                      <input
                        type="date"
                        title="Invoice Date"
                        value={editData.invoice_date}
                        onChange={(e) => setEditData(prev => ({ ...prev, invoice_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        title="Due Date"
                        value={editData.due_date}
                        onChange={(e) => setEditData(prev => ({ ...prev, due_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        title="Tax Rate (%)"
                        value={editData.tax_rate}
                        onChange={(e) => setEditData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        title="Invoice status"
                        value={editData.status}
                        onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={editData.notes}
                        onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Additional notes..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Terms & Conditions
                      </label>
                      <textarea
                        value={editData.terms}
                        onChange={(e) => setEditData(prev => ({ ...prev, terms: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Payment terms..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Items */}
            <div className="bg-brand-snowman dark:bg-gray-900 rounded-sm border border-brand-tropical p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-gray-900">Items</h3>
                {!isEditing && (
                  <Button onClick={() => setIsAddingItem(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                )}
              </div>

              {/* Add Item Form */}
              {isAddingItem && (
                <div className="bg-brand-snowman dark:bg-gray-900 rounded-sm border border-brand-tropical p-6 mb-6">
                  <h4 className="text-gray-900 mb-3">Add New Item</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={newItem.description}
                        onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Item description"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        title="Quantity"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        title="Unit Price"
                        value={newItem.unit_price}
                        onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-3">
                    <Button onClick={handleAddItem} size="sm">
                      Add Item
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingItem(false)} size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-900">Description</th>
                      <th className="text-right py-2 text-gray-900">Quantity</th>
                      <th className="text-right py-2 text-gray-900">Unit Price</th>
                      <th className="text-right py-2 text-gray-900">Total</th>
                      {!isEditing && (
                        <th className="text-center py-2 text-gray-900">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">{item.description}</td>
                        <td className="py-3 text-right text-gray-900">{item.quantity}</td>
                        <td className="py-3 text-right text-gray-900">{formatCurrency(item.unit_price)}</td>
                          <td className="py-3 text-right text-gray-900">
                          {formatCurrency(item.total_price)}
                        </td>
                        {!isEditing && (
                          <td className="py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {invoiceItems.length === 0 && (
                      <tr>
                        <td colSpan={isEditing ? 4 : 5} className="py-8 text-center text-gray-500">
                          No items added yet. Click &quot;Add Item&quot; to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              {invoiceItems.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      {invoice.tax_rate > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tax ({invoice.tax_rate}%):</span>
                          <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg text-gray-900 border-t border-gray-200 pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(invoice.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes and Terms */}
            {(invoice.notes || invoice.terms) && (
              <div className="bg-brand-snowman dark:bg-gray-900 rounded-sm border border-brand-tropical p-6 mb-6">
                {invoice.notes && (
                  <div className="mb-4">
                    <h3 className="text-lg text-gray-900 mb-2">Notes</h3>
                    <p className="text-gray-600">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div>
                    <h3 className="text-lg text-gray-900 mb-2">Terms & Conditions</h3>
                    <p className="text-gray-600">{invoice.terms}</p>
                  </div>
                )}
              </div>
            )}

            {/* Payment History */}
            <div className="bg-brand-snowman dark:bg-gray-900 rounded-sm border border-brand-tropical p-6">
              <PaymentHistory 
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoice_number}
                totalAmount={invoice.total_amount}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
