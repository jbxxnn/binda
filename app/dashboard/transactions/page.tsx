"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePreferences } from "@/lib/contexts/preferences-context";
import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
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
  // Plus,
  // Minus,
  DollarSign,
  Calendar,
  Loader,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

interface Transaction {
  id: string;
  business_id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  customer_id?: string;
  customer?: {
    id: string;
    name: string;
  };
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

type FormState = "idle" | "loading" | "success";

export default function TransactionsPage() {
  const { formatCurrency, formatDate } = usePreferences();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formState, setFormState] = useState<FormState>("idle");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    transactionId: string;
    description: string;
  }>({
    isOpen: false,
    transactionId: "",
    description: ""
  });
  const [customers, setCustomers] = useState<{id: string, name: string}[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string, type: string}[]>([]);
  const [formData, setFormData] = useState({
    type: "income",
    category: "",
    description: "",
    amount: "",
    customer_id: "",
    transaction_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        
        // Get current user and business
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user found');
          return;
        }
        console.log('Current user:', user.id);

        const { data: businesses } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id);

        if (!businesses || businesses.length === 0) {
          console.log('No businesses found for user');
          return;
        }

        const business = businesses[0];
        console.log('Current business:', business.id, business.name);

        // Get transactions for this business
        const { data: transactionsData, error } = await supabase
          .from('transactions')
          .select(`
            *,
            customer:customers(id, name)
          `)
          .eq('business_id', business.id)
          .order('transaction_date', { ascending: false });

        if (error) {
          console.error('Error fetching transactions:', error);
          setTransactions([]);
        } else {
          setTransactions(transactionsData || []);
        }

        // Get customers for this business
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name')
          .eq('business_id', business.id)
          .order('name');

        setCustomers(customersData || []);

        // Get categories for this business
        console.log('Searching for categories with business_id:', business.id);
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name, type, business_id')
          .eq('business_id', business.id)
          .eq('is_active', true)
          .order('name');

        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
        } else {
          console.log('Categories fetched:', categoriesData);
          console.log('Total categories found:', categoriesData?.length || 0);
        }

        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setTransactions([]);
        setCustomers([]);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);



  const handleDeleteClick = useCallback((transactionId: string, description: string) => {
    setDeleteDialog({
      isOpen: true,
      transactionId,
      description
    });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const { transactionId, description } = deleteDialog;
    
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        console.error('Error deleting transaction:', error);
        toast.error('Failed to delete transaction. Please try again.');
        return;
      }

      // Remove transaction from local state
      setTransactions(prev => prev.filter(transaction => transaction.id !== transactionId));

      toast.success(`Transaction "${description}" has been deleted successfully.`);

    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction. Please try again.');
    }
  }, [deleteDialog]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({
      isOpen: false,
      transactionId: "",
      description: ""
    });
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

      // Create transaction
      const { data: newTransaction, error } = await supabase
        .from('transactions')
        .insert({
          business_id: business.id,
          type: formData.type,
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          customer_id: formData.customer_id || null,
          transaction_date: formData.transaction_date,
        })
        .select(`
          *,
          customer:customers(id, name)
        `)
        .single();

      if (error) {
        console.error('Error creating transaction:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error(`Failed to create transaction: ${error.message || 'Unknown error'}`);
        setFormState("idle");
        return;
      }

      // Add new transaction to the list
      setTransactions(prev => [newTransaction, ...prev]);
      
      setFormState("success");
      toast.success(`Transaction added successfully.`);
      
      // Reset form and close after success
      setTimeout(() => {
        setIsFormOpen(false);
        setFormState("idle");
        setFormData({
          type: "income",
          category: "",
          description: "",
          amount: "",
          customer_id: "",
          transaction_date: new Date().toISOString().split('T')[0]
        });
      }, 2000);

    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to create transaction. Please try again.');
      setFormState("idle");
    }
  };

  const columns = useMemo<ColumnDef<Transaction>[]>(
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
        id: "transaction",
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Transaction" />
        ),
        cell: ({ row }) => {
          const transaction = row.original;
          const Icon = transaction.type === 'income' ? TrendingUp : TrendingDown;
          const colorClass = transaction.type === 'income' ? 'text-green-600' : 'text-red-600';
          
          return (
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Icon className={`w-4 h-4 ${colorClass}`} />
              </div>
              <div>
                <div className="font-medium text-gray-900">{transaction.description}</div>
                <div className="text-sm text-gray-500">{transaction.category}</div>
              </div>
            </div>
          );
        },
        meta: {
          label: "Transaction",
          placeholder: "Search transactions...",
          variant: "text",
        },
        enableColumnFilter: true,
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Amount" />
        ),
        cell: ({ row }) => {
          const amount = row.getValue<number>("amount");
          const transaction = row.original;
          const colorClass = transaction.type === 'income' ? 'text-green-600' : 'text-red-600';
          
          return (
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span className={`text-sm font-medium ${colorClass}`}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(amount)}
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
        id: "customer",
        accessorFn: (row) => row.customer?.name || 'No customer',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Customer" />
        ),
        cell: ({ row }) => {
          const customer = row.original.customer;
          return (
            <span className="text-sm text-gray-900">
              {customer?.name || 'No customer'}
            </span>
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
        id: "transaction_date",
        accessorKey: "transaction_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => {
          const date = row.getValue<string>("transaction_date");
          return (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm text-gray-600">
                {formatDate(date)}
              </span>
            </div>
          );
        },
        meta: {
          label: "Date",
          variant: "date",
        },
        enableColumnFilter: true,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const transaction = row.original;
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
                  <Link href={`/dashboard/transactions/${transaction.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => handleDeleteClick(transaction.id, transaction.description)}
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
    [handleDeleteClick]
  );

  const { table } = useDataTable({
    data: transactions,
    columns,
    pageCount: Math.ceil(transactions.length / 10),
    initialState: {
      sorting: [{ id: "transaction_date", desc: true }],
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
              <h1 className="text-2xl font-medium">Transactions</h1>
            </div>
            <div className="flex items-center space-x-4">
              <PopoverForm
                title="Add Transaction"
                open={isFormOpen}
                setOpen={setIsFormOpen}
                width="400px"
                height="auto"
                showCloseButton={formState !== "success"}
                showSuccess={formState === "success"}
                openChild={
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-muted-foreground">
                        Transaction Type
                      </label>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant={formData.type === 'income' ? 'default' : 'outline'}
                          onClick={() => setFormData(prev => ({ ...prev, type: 'income', category: '' }))}
                          className="flex-1"
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Money In
                        </Button>
                        <Button
                          type="button"
                          variant={formData.type === 'expense' ? 'default' : 'outline'}
                          onClick={() => setFormData(prev => ({ ...prev, type: 'expense', category: '' }))}
                          className="flex-1"
                        >
                          <TrendingDown className="w-4 h-4 mr-2" />
                          Money Out
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="category" className="block text-sm font-medium text-muted-foreground">
                        Category
                      </label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                        required
                      >
                        <option value="">Select category</option>
                        {categories
                          .filter(category => category.type === formData.type)
                          .map((category) => (
                            <option key={category.id} value={category.name}>
                              {category.name}
                            </option>
                          ))}
                        {categories.length === 0 && (
                          <option value="" disabled>
                            No categories found. Create some in the Categories section first.
                          </option>
                        )}
                        {categories.length > 0 && categories.filter(category => category.type === formData.type).length === 0 && (
                          <option value="" disabled>
                            No {formData.type} categories found. Create some in the Categories section first.
                          </option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="description" className="block text-sm font-medium text-muted-foreground">
                        Description
                      </label>
                      <input
                        type="text"
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g., Haircut service, Office supplies"
                        className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="amount" className="block text-sm font-medium text-muted-foreground">
                        Amount
                      </label>
                      <input
                        type="number"
                        id="amount"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                        required
                      />
                    </div>

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

                    <div className="space-y-2">
                      <label htmlFor="transaction_date" className="block text-sm font-medium text-muted-foreground">
                        Date
                      </label>
                      <input
                        type="date"
                        id="transaction_date"
                        value={formData.transaction_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                        required
                      />
                    </div>

                    <PopoverFormButton
                      loading={formState === "loading"}
                      text="Add Transaction"
                    />
                  </form>
                }
                successChild={
                  <PopoverFormSuccess
                    title="Transaction Added!"
                    description="Your transaction has been recorded successfully."
                  />
                }
              />
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
        title="Delete Transaction"
        description={`Are you sure you want to delete "${deleteDialog.description}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}