"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Plus, 
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Building2,
  Calendar,
  MapPin
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
        size: 32,
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
            <div className="flex items-center space-x-3">
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
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 32,
      },
    ],
    []
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
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full bg-brand-lightning relative">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Page Header */}
        <div className="px-6 py-4 border-b bg-brand-lightning">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">Customers</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white">
                <Link href="/dashboard/customers/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Customer
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="data-table-container">
            <DataTable table={table}>
              <DataTableToolbar table={table} />
            </DataTable>
          </div>
        </div>
      </div>
    </div>
  );
}