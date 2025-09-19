"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import {
  PopoverForm,
  PopoverFormButton,
  PopoverFormSuccess,
} from "@/components/ui/popover-form";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Download,
  Send,
  Eye,
  Calendar,
  DollarSign,
  User,
  Loader,
  // TrendingUp,
  // Clock,
  CheckCircle,
  AlertCircle,
  X,
//   Plus
} from "lucide-react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { pdf } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/invoice-pdf';

interface Invoice {
  id: string;
  business_id: string;
  customer_id?: string;
  transaction_id?: string;
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
  };
}

type FormState = "idle" | "loading" | "success";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formState, setFormState] = useState<FormState>("idle");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    invoiceId: string;
    invoiceNumber: string;
  }>({
    isOpen: false,
    invoiceId: "",
    invoiceNumber: ""
  });
  const [customers, setCustomers] = useState<{id: string, name: string}[]>([]);
  const [statusSummary, setStatusSummary] = useState({
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0
  });
  const [formData, setFormData] = useState({
    customer_id: "",
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    tax_rate: 0,
    notes: "",
    terms: "Payment due within 30 days of invoice date."
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        
        // Get current user and business
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: businesses } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id);

        if (!businesses || businesses.length === 0) return;

        const business = businesses[0];

        // Get invoices for this business
        const { data: invoicesData, error } = await supabase
          .from('invoices')
          .select(`
            *,
            customer:customers(id, name)
          `)
          .eq('business_id', business.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching invoices:', error);
          setInvoices([]);
          setStatusSummary({ draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0 });
        } else {
          setInvoices(invoicesData || []);
          setStatusSummary(calculateStatusSummary(invoicesData || []));
        }

        // Get customers for this business
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name')
          .eq('business_id', business.id)
          .order('name');

        setCustomers(customersData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setInvoices([]);
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateStatusSummary = (invoices: Invoice[]) => {
    const summary = {
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0
    };
    
    invoices.forEach(invoice => {
      if (summary.hasOwnProperty(invoice.status)) {
        summary[invoice.status as keyof typeof summary]++;
      }
    });
    
    return summary;
  };

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

  const handleDeleteClick = useCallback((invoiceId: string, invoiceNumber: string) => {
    setDeleteDialog({
      isOpen: true,
      invoiceId,
      invoiceNumber
    });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const { invoiceId, invoiceNumber } = deleteDialog;
    
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) {
        console.error('Error deleting invoice:', error);
        toast.error('Failed to delete invoice. Please try again.');
        return;
      }

      // Remove invoice from local state
      setInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));

      toast.success(`Invoice ${invoiceNumber} has been deleted successfully.`);

    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice. Please try again.');
    }
  }, [deleteDialog]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({
      isOpen: false,
      invoiceId: "",
      invoiceNumber: ""
    });
  }, []);

  const handleGeneratePDF = useCallback(async (invoice: Invoice) => {
    try {
      toast.info('Generating PDF...');
      
      // Fetch invoice items
      const supabase = createClient();
      const { data: itemsData } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('created_at');

      // Generate PDF blob
      const blob = await pdf(<InvoicePDF invoice={invoice} items={itemsData || []} />).toBlob();
      
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("loading");

    try {
      const supabase = createClient();
      
      // Get current user and business
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businesses } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id);

      if (!businesses || businesses.length === 0) return;

      const business = businesses[0];

      // Generate invoice number
      let invoiceNumber;
      const { data: generatedNumber, error: invoiceNumberError } = await supabase.rpc('generate_invoice_number', {
        business_uuid: business.id
      });

      if (invoiceNumberError) {
        console.error('Error generating invoice number:', invoiceNumberError);
        // Fallback: generate a simple invoice number
        const timestamp = Date.now().toString().slice(-6);
        invoiceNumber = `INV-${timestamp}`;
        console.log('Using fallback invoice number:', invoiceNumber);
      } else if (!generatedNumber) {
        console.error('Invoice number is null or undefined');
        // Fallback: generate a simple invoice number
        const timestamp = Date.now().toString().slice(-6);
        invoiceNumber = `INV-${timestamp}`;
        console.log('Using fallback invoice number:', invoiceNumber);
      } else {
        invoiceNumber = generatedNumber;
        console.log('Generated invoice number:', invoiceNumber);
      }

      // Create invoice
      const { data: newInvoice, error } = await supabase
        .from('invoices')
        .insert({
          business_id: business.id,
          customer_id: formData.customer_id || null,
          invoice_number: invoiceNumber,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date || null,
          tax_rate: formData.tax_rate,
          notes: formData.notes || null,
          terms: formData.terms || null,
        })
        .select(`
          *,
          customer:customers(id, name)
        `)
        .single();

      if (error) {
        console.error('Error creating invoice:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error(`Failed to create invoice: ${error.message || 'Unknown error'}`);
        setFormState("idle");
        return;
      }

      // Add new invoice to the list
      setInvoices(prev => [newInvoice, ...prev]);
      
      setFormState("success");
      toast.success(`Invoice ${invoiceNumber} has been created successfully.`);
      
      // Reset form and close after success
      setTimeout(() => {
        setIsFormOpen(false);
        setFormState("idle");
        setFormData({
          customer_id: "",
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          tax_rate: 0,
          notes: "",
          terms: "Payment due within 30 days of invoice date."
        });
      }, 2000);

    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice. Please try again.');
      setFormState("idle");
    }
  };

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        size: 32,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "invoice",
        accessorKey: "invoice_number",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Invoice" />
        ),
        cell: ({ row }) => {
          const invoice = row.original;
          return (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{invoice.invoice_number}</div>
                <div className="text-sm text-gray-500">
                  {formatDate(invoice.invoice_date)}
                </div>
              </div>
            </div>
          );
        },
        meta: {
          label: "Invoice",
          placeholder: "Search invoices...",
          variant: "text",
        },
        enableColumnFilter: true,
      },
      {
        id: "customer",
        accessorFn: (row) => row.customer?.name || 'No customer',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Customer" />
        ),
        cell: ({ row }) => {
          const customer = row.original.customer;
          return (
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-900">
                {customer?.name || 'No customer'}
              </span>
            </div>
          );
        },
        meta: {
          label: "Customer",
          placeholder: "Search customers...",
          variant: "text",
        },
        enableColumnFilter: true,
      },
      {
        id: "amount",
        accessorKey: "total_amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Amount" />
        ),
        cell: ({ row }) => {
          const amount = row.getValue<number>("amount");
          return (
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(amount)}
              </span>
            </div>
          );
        },
        meta: {
          label: "Amount",
          variant: "number",
        },
        enableColumnFilter: true,
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const status = row.getValue<string>("status");
          return (
            <Badge className={`capitalize ${getStatusColor(status)}`}>
              {status}
            </Badge>
          );
        },
        meta: {
          label: "Status",
          variant: "multiSelect",
          options: [
            { label: "Draft", value: "draft" },
            { label: "Sent", value: "sent" },
            { label: "Paid", value: "paid" },
            { label: "Overdue", value: "overdue" },
            { label: "Cancelled", value: "cancelled" },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: "due_date",
        accessorKey: "due_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Due Date" />
        ),
        cell: ({ row }) => {
          const dueDate = row.getValue<string>("due_date");
          return (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm text-gray-600">
                {dueDate ? formatDate(dueDate) : 'No due date'}
              </span>
            </div>
          );
        },
        meta: {
          label: "Due Date",
          variant: "date",
        },
        enableColumnFilter: true,
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" />
        ),
        cell: ({ row }) => {
          const createdDate = row.getValue<string>("created_at");
          return (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm text-gray-600">
                {formatDate(createdDate)}
              </span>
            </div>
          );
        },
        meta: {
          label: "Created",
          variant: "date",
        },
        enableColumnFilter: true,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const invoice = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/invoices/${invoice.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/invoices/${invoice.id}?edit=true`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleGeneratePDF(invoice)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => handleDeleteClick(invoice.id, invoice.invoice_number)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 32,
        meta: {
          sticky: "right",
          className: "sticky right-0 bg-brand-snowman z-10 border-l border-gray-200 sm:static sm:border-l-0",
        },
      },
    ],
    [handleDeleteClick, handleGeneratePDF]
  );

  const { table } = useDataTable({
    data: invoices,
    columns,
    pageCount: Math.ceil(invoices.length / 10),
    initialState: {
      sorting: [{ id: "created_at", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    getRowId: (row) => row.id,
    manualFiltering: false,
    manualSorting: false,
    manualPagination: false,
  });

  if (isLoading) {
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
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-medium">Invoices</h1>
            </div>
            <div className="flex items-center space-x-4">
              <PopoverForm
                title="Create Invoice"
                open={isFormOpen}
                setOpen={setIsFormOpen}
                width="400px"
                height="auto"
                showCloseButton={formState !== "success"}
                showSuccess={formState === "success"}
                openChild={
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="customer_id" className="block text-sm font-medium text-muted-foreground">
                        Customer (Optional)
                      </label>
                      <select
                        id="customer_id"
                        value={formData.customer_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                      >
                        <option value="">No customer</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-4 grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="invoice_date" className="block text-sm font-medium text-muted-foreground">
                          Invoice Date
                        </label>
                        <input
                          type="date"
                          id="invoice_date"
                          value={formData.invoice_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="due_date" className="block text-sm font-medium text-muted-foreground">
                          Due Date
                        </label>
                        <input
                          type="date"
                          id="due_date"
                          value={formData.due_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="tax_rate" className="block text-sm font-medium text-muted-foreground">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        id="tax_rate"
                        value={formData.tax_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">
                        Notes
                      </label>
                      <textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional notes for the invoice..."
                        rows={3}
                        className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="terms" className="block text-sm font-medium text-muted-foreground">
                        Terms & Conditions
                      </label>
                      <textarea
                        id="terms"
                        value={formData.terms}
                        onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                        placeholder="Payment terms and conditions..."
                        rows={2}
                        className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                      />
                    </div>

                    <PopoverFormButton
                      loading={formState === "loading"}
                      text="Create Invoice"
                    />
                  </form>
                }
                successChild={
                  <PopoverFormSuccess
                    title="Invoice Created!"
                    description="Your invoice has been created successfully. You can now add line items and generate a PDF."
                  />
                }
              />
            </div>
          </div>
        </div>

        {/* Status Summary Cards */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Draft</p>
                  <p className="text-2xl font-bold text-gray-900">{statusSummary.draft}</p>
                </div>
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <FileText className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{statusSummary.sent}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Send className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-gray-900">{statusSummary.paid}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">{statusSummary.overdue}</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cancelled</p>
                  <p className="text-2xl font-bold text-gray-900">{statusSummary.cancelled}</p>
                </div>
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto p-6 w-full max-w-full">
          <div className="data-table-container w-full max-w-full min-w-0 overflow-x-auto">
            <DataTable table={table}>
              <DataTableToolbar table={table} />
            </DataTable>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice ${deleteDialog.invoiceNumber}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
