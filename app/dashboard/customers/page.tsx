"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePreferences } from "@/lib/contexts/preferences-context";
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
import { CustomerDrawer } from "@/components/customer-drawer";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Building2,
  Calendar,
  MapPin,
  Loader
} from "lucide-react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

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
}

type FormState = "idle" | "loading" | "success";

export default function CustomersPage() {
  const { formatDate } = usePreferences();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formState, setFormState] = useState<FormState>("idle");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    customerId: string;
    customerName: string;
  }>({
    isOpen: false,
    customerId: "",
    customerName: ""
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    customer_type: "individual",
    notes: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "US"
  });

  useEffect(() => {
    const fetchCustomers = async () => {
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

        // Get customers for this business
        const { data: customersData } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false });

        setCustomers(customersData || []);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  // const formatCurrency = (amount: number) => {
  //   return new Intl.NumberFormat('en-US', {
  //     style: 'currency',
  //     currency: 'USD'
  //   }).format(amount);
  // };


  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    // Delay clearing the customer to allow exit animation to complete
    setTimeout(() => {
      setSelectedCustomer(null);
    }, 300);
  }, []);

  const handleDeleteClick = useCallback((customerId: string, customerName: string) => {
    setDeleteDialog({
      isOpen: true,
      customerId,
      customerName
    });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
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

      // Remove customer from local state
      setCustomers(prev => prev.filter(customer => customer.id !== customerId));
      
      // Close drawer if the deleted customer was selected
      if (selectedCustomer?.id === customerId) {
        handleCloseDrawer();
      }

      toast.success(`${customerName} has been deleted successfully.`);

    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer. Please try again.');
    }
  }, [deleteDialog, selectedCustomer, handleCloseDrawer]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({
      isOpen: false,
      customerId: "",
      customerName: ""
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

      // Create customer
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          business_id: business.id,
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          customer_type: formData.customer_type,
          notes: formData.notes || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zip_code || null,
          country: formData.country || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating customer:', error);
        toast.error('Failed to create customer. Please try again.');
        setFormState("idle");
        return;
      }

      // Add new customer to the list
      setCustomers(prev => [newCustomer, ...prev]);
      
      setFormState("success");
      toast.success(`${formData.name} has been added successfully.`);
      
      // Reset form and close after success
      setTimeout(() => {
        setIsFormOpen(false);
        setFormState("idle");
        setFormData({
          name: "",
          email: "",
          phone: "",
          customer_type: "individual",
          notes: "",
          address: "",
          city: "",
          state: "",
          zip_code: "",
          country: "US"
        });
      }, 2000);

    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer. Please try again.');
      setFormState("idle");
    }
  };

  const columns = useMemo<ColumnDef<Customer>[]>(
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
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "contact",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Contact" />
        ),
        cell: ({ row }) => {
          const customer = row.original;
          return (
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded-lg transition-colors"
              onClick={() => handleCustomerClick(customer)}
            >
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-teal-700">
                  {getInitials(customer.name || '')}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">{customer.name || 'Unnamed Customer'}</div>
                <div className="text-sm text-gray-500">{customer.email || 'No email'}</div>
              </div>
            </div>
          );
        },
        meta: {
          label: "Contact",
          placeholder: "Search customers...",
          variant: "text",
          icon: User,
        },
        enableColumnFilter: true,
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Phone" />
        ),
        cell: ({ row }) => {
          const phone = row.getValue<string>("phone");
          return (
            <div className="flex items-center space-x-1">
              <span className="text-sm">🇺🇸</span>
              <span className="text-sm text-gray-900">{phone || 'No phone'}</span>
            </div>
          );
        },
        meta: {
          label: "Phone",
          placeholder: "Search phone numbers...",
          variant: "text",
        },
        enableColumnFilter: true,
      },
      {
        id: "type",
        accessorKey: "customer_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => {
          const type = row.getValue<string>("type");
          const Icon = type === "business" ? Building2 : User;
          return (
            <Badge variant="outline" className="capitalize">
              <Icon className="w-3 h-3 mr-1" />
              {type === "business" ? "Business" : "Individual"}
            </Badge>
          );
        },
        meta: {
          label: "Type",
          variant: "multiSelect",
          options: [
            { label: "Individual", value: "individual", icon: User },
            { label: "Business", value: "business", icon: Building2 },
          ],
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
          const date = row.getValue<string>("created_at");
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
          label: "Created",
          variant: "date",
        },
        enableColumnFilter: true,
      },
      {
        id: "location",
        accessorFn: (row) => `${row.city}, ${row.state}`,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Location" />
        ),
        cell: ({ row }) => {
          const customer = row.original;
          return (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span className="text-sm text-gray-600">
                {customer.city && customer.state 
                  ? `${customer.city}, ${customer.state}` 
                  : 'Not specified'
                }
              </span>
            </div>
          );
        },
        meta: {
          label: "Location",
          placeholder: "Search locations...",
          variant: "text",
        },
        enableColumnFilter: true,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const customer = row.original;
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
                  <Link href={`/dashboard/customers/${customer.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => handleDeleteClick(customer.id, customer.name)}
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
    data: customers,
    columns,
    pageCount: Math.ceil(customers.length / 10),
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
              <h1 className="text-2xl font-medium">Customers</h1>
            </div>
            <div className="flex items-center space-x-4">
             

<PopoverForm
        title="Add Customer"
        open={isFormOpen}
        setOpen={setIsFormOpen}
        width="371px"
        height="auto"
        showCloseButton={formState !== "success"}
        showSuccess={formState === "success"}
        openChild={
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
                Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                required
              />
            </div>

            <div className="grid gap-4 grid-cols-2">

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
              />
            </div>

            </div>

            <div className="space-y-2">
              <label htmlFor="customer_type" className="block text-sm font-medium text-muted-foreground">
                Type
              </label>
              <select
                id="customer_type"
                value={formData.customer_type}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_type: e.target.value }))}
                className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
            </div>

            
            <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="city" className="block text-sm font-medium text-muted-foreground">
                City
              </label>
              <input
                type="text"
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="state" className="block text-sm font-medium text-muted-foreground">
                State
              </label>
              <input
                type="text"
                id="state"
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
              />
            </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">
                Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
              />
            </div>

            <PopoverFormButton
              loading={formState === "loading"}
              text="Add Customer"
            />
          </form>
        }
        successChild={
          <PopoverFormSuccess
            title="Customer Added Successfully!"
            description="The new customer has been added to your database."
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

      {/* Add Customer Popover Form */}

      {/* Customer Drawer */}
      <CustomerDrawer
        customer={selectedCustomer}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onDelete={handleDeleteClick}
      />

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