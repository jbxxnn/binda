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
import { AccountDrawer } from "@/components/account-drawer";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
//   TrendingDown,
  Building2,
  CreditCard,
  Loader,
  Plus,
  Minus
} from "lucide-react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

interface Account {
  id: string;
  business_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  parent_account_id?: string;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
  parent_account?: {
    id: string;
    account_name: string;
  };
}

type FormState = "idle" | "loading" | "success";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formState, setFormState] = useState<FormState>("idle");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    accountId: string;
    accountName: string;
  }>({
    isOpen: false,
    accountId: "",
    accountName: ""
  });
  const [formData, setFormData] = useState({
    account_code: "",
    account_name: "",
    account_type: "asset",
    parent_account_id: "",
    description: "",
    is_active: true
  });

  useEffect(() => {
    const fetchAccounts = async () => {
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

        // Get accounts for this business
        const { data: accountsData, error } = await supabase
          .from('accounts')
          .select(`
            *,
            parent_account:accounts!parent_account_id(id, account_name)
          `)
          .eq('business_id', business.id)
          .order('account_code');

        if (error) {
          console.error('Error fetching accounts:', error);
          // If accounts table doesn't exist, show empty state
          if (error.code === 'PGRST116') {
            console.log('Accounts table does not exist. Please run the migration first.');
            setAccounts([]);
          } else {
            // Other errors, still set empty array
            setAccounts([]);
          }
        } else {
          console.log('Accounts fetched successfully:', accountsData);
          if (accountsData && accountsData.length === 0) {
            // No accounts found, create default chart of accounts
            console.log('No accounts found, creating default chart of accounts...');
            const { error: createError } = await supabase.rpc('create_default_chart_of_accounts', {
              business_uuid: business.id
            });
            
            if (createError) {
              console.error('Error creating default chart of accounts:', createError);
            } else {
              // Fetch accounts again after creating them
              const { data: newAccountsData } = await supabase
                .from('accounts')
                .select(`
                  *,
                  parent_account:accounts!parent_account_id(id, account_name)
                `)
                .eq('business_id', business.id)
                .order('account_code');
              
              console.log('Default accounts created:', newAccountsData);
              setAccounts(newAccountsData || []);
            }
          } else {
            setAccounts(accountsData || []);
          }
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'asset':
        return Building2;
      case 'liability':
        return CreditCard;
      case 'equity':
        return TrendingUp;
      case 'revenue':
        return Plus;
      case 'expense':
        return Minus;
      default:
        return DollarSign;
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'liability':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'equity':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'revenue':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'expense':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleAccountClick = (account: Account) => {
    setSelectedAccount(account);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    // Delay clearing the account to allow exit animation to complete
    setTimeout(() => {
      setSelectedAccount(null);
    }, 300);
  }, []);

  const handleDeleteClick = useCallback((accountId: string, accountName: string) => {
    setDeleteDialog({
      isOpen: true,
      accountId,
      accountName
    });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const { accountId, accountName } = deleteDialog;
    
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);

      if (error) {
        console.error('Error deleting account:', error);
        toast.error('Failed to delete account. Please try again.');
        return;
      }

      // Remove account from local state
      setAccounts(prev => prev.filter(account => account.id !== accountId));
      
      // Close drawer if the deleted account was selected
      if (selectedAccount?.id === accountId) {
        handleCloseDrawer();
      }

      toast.success(`${accountName} has been deleted successfully.`);

    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account. Please try again.');
    }
  }, [deleteDialog, selectedAccount, handleCloseDrawer]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({
      isOpen: false,
      accountId: "",
      accountName: ""
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

      // Create account
      const { data: newAccount, error } = await supabase
        .from('accounts')
        .insert({
          business_id: business.id,
          account_code: formData.account_code,
          account_name: formData.account_name,
          account_type: formData.account_type,
          parent_account_id: formData.parent_account_id || null,
          description: formData.description || null,
          is_active: formData.is_active,
        })
        .select(`
          *,
          parent_account:accounts!parent_account_id(id, account_name)
        `)
        .single();

      if (error) {
        console.error('Error creating account:', error);
        toast.error('Failed to create account. Please try again.');
        setFormState("idle");
        return;
      }

      // Add new account to the list
      setAccounts(prev => [newAccount, ...prev]);
      
      setFormState("success");
      toast.success(`${formData.account_name} has been added successfully.`);
      
      // Reset form and close after success
      setTimeout(() => {
        setIsFormOpen(false);
        setFormState("idle");
        setFormData({
          account_code: "",
          account_name: "",
          account_type: "asset",
          parent_account_id: "",
          description: "",
          is_active: true
        });
      }, 2000);

    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Failed to create account. Please try again.');
      setFormState("idle");
    }
  };

  const columns = useMemo<ColumnDef<Account>[]>(
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
        id: "account",
        accessorKey: "account_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Account" />
        ),
        cell: ({ row }) => {
          const account = row.original;
          const TypeIcon = getAccountTypeIcon(account.account_type);
          return (
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded-lg transition-colors"
              onClick={() => handleAccountClick(account)}
            >
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <TypeIcon className="w-4 h-4 text-gray-700" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{account.account_code}</div>
                <div className="text-sm text-gray-500">{account.account_name}</div>
              </div>
            </div>
          );
        },
        meta: {
          label: "Account",
          placeholder: "Search accounts...",
          variant: "text",
          icon: DollarSign,
        },
        enableColumnFilter: true,
      },
      {
        id: "type",
        accessorKey: "account_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => {
          const type = row.getValue<string>("type");
          return (
            <Badge className={`capitalize ${getAccountTypeColor(type)}`}>
              {type}
            </Badge>
          );
        },
        meta: {
          label: "Type",
          variant: "multiSelect",
          options: [
            { label: "Asset", value: "asset" },
            { label: "Liability", value: "liability" },
            { label: "Equity", value: "equity" },
            { label: "Revenue", value: "revenue" },
            { label: "Expense", value: "expense" },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: "parent",
        accessorFn: (row) => row.parent_account?.account_name || 'None',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Parent Account" />
        ),
        cell: ({ row }) => {
          const parent = row.original.parent_account;
          return (
            <span className="text-sm text-gray-900">
              {parent?.account_name || 'None'}
            </span>
          );
        },
        meta: {
          label: "Parent Account",
          placeholder: "Search parent accounts...",
          variant: "text",
        },
        enableColumnFilter: true,
      },
      {
        id: "status",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const isActive = row.getValue<boolean>("status");
          return (
            <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
        meta: {
          label: "Status",
          variant: "multiSelect",
          options: [
            { label: "Active", value: "true" },
            { label: "Inactive", value: "false" },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const account = row.original;
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
                  <Link href={`/dashboard/accounts/${account.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => handleDeleteClick(account.id, account.account_name)}
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
    data: accounts,
    columns,
    pageCount: Math.ceil(accounts.length / 10),
    initialState: {
      sorting: [{ id: "account_code", desc: false }],
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
              <h1 className="text-2xl font-medium">Chart of Accounts</h1>
            </div>
            <div className="flex items-center space-x-4">
             

<PopoverForm
        title="Add Account"
        open={isFormOpen}
        setOpen={setIsFormOpen}
        width="400px"
        height="auto"
        showCloseButton={formState !== "success"}
        showSuccess={formState === "success"}
        openChild={
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="account_code" className="block text-sm font-medium text-muted-foreground">
                  Account Code *
                </label>
                <input
                  type="text"
                  id="account_code"
                  value={formData.account_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="account_type" className="block text-sm font-medium text-muted-foreground">
                  Account Type *
                </label>
                <select
                  id="account_type"
                  value={formData.account_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                  required
                >
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                  <option value="equity">Equity</option>
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="account_name" className="block text-sm font-medium text-muted-foreground">
                Account Name *
              </label>
              <input
                type="text"
                id="account_name"
                value={formData.account_name}
                onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="parent_account_id" className="block text-sm font-medium text-muted-foreground">
                Parent Account
              </label>
              <select
                id="parent_account_id"
                value={formData.parent_account_id}
                onChange={(e) => setFormData(prev => ({ ...prev, parent_account_id: e.target.value }))}
                className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
              >
                <option value="">No Parent Account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_code} - {account.account_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-muted-foreground">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-brand-tropical"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-muted-foreground">
                Active Account
              </label>
            </div>

            <PopoverFormButton
              loading={formState === "loading"}
              text="Add Account"
            />
          </form>
        }
        successChild={
          <PopoverFormSuccess
            title="Account Added Successfully!"
            description="The new account has been added to your chart of accounts."
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

      {/* Account Drawer */}
      <AccountDrawer
        account={selectedAccount}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onDelete={handleDeleteClick}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Account"
        description={`Are you sure you want to delete account ${deleteDialog.accountName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
