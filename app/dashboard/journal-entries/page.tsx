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
// import {
//   PopoverForm,
//   PopoverFormButton,
//   PopoverFormSuccess,
// } from "@/components/ui/popover-form";
import { JournalEntryDrawer } from "@/components/journal-entry-drawer";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader,
  Plus,
//   Minus
} from "lucide-react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

interface JournalEntry {
  id: string;
  business_id: string;
  entry_number: string;
  entry_date: string;
  description?: string;
  reference?: string;
  total_debit: number;
  total_credit: number;
  is_posted: boolean;
  created_at: string;
  updated_at: string;
  journal_entry_lines?: JournalEntryLine[];
}

interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  line_number: number;
  description?: string;
  debit_amount: number;
  credit_amount: number;
  account?: {
    id: string;
    account_code: string;
    account_name: string;
    account_type: string;
  };
}

// type FormState = "idle" | "loading" | "success";

export default function JournalEntriesPage() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
//   const [formState, setFormState] = useState<FormState>("idle");
//   const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    entryId: string;
    entryNumber: string;
  }>({
    isOpen: false,
    entryId: "",
    entryNumber: ""
  });

  useEffect(() => {
    const fetchJournalEntries = async () => {
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

        // Get journal entries for this business
        const { data: entriesData, error } = await supabase
          .from('journal_entries')
          .select(`
            *,
            journal_entry_lines(
              *,
              account:accounts(id, account_code, account_name, account_type)
            )
          `)
          .eq('business_id', business.id)
          .order('entry_date', { ascending: false });

        if (error) {
          console.error('Error fetching journal entries:', error);
          if (error.code === 'PGRST116') {
            console.log('Journal entries table does not exist. Please run the migration first.');
            setJournalEntries([]);
          }
        } else {
          setJournalEntries(entriesData || []);
        }
      } catch (error) {
        console.error('Error fetching journal entries:', error);
        setJournalEntries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJournalEntries();
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

  const handleEntryClick = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    // Delay clearing the entry to allow exit animation to complete
    setTimeout(() => {
      setSelectedEntry(null);
    }, 300);
  }, []);

  const handleDeleteClick = useCallback((entryId: string, entryNumber: string) => {
    setDeleteDialog({
      isOpen: true,
      entryId,
      entryNumber
    });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const { entryId, entryNumber } = deleteDialog;
    
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error('Error deleting journal entry:', error);
        toast.error('Failed to delete journal entry. Please try again.');
        return;
      }

      // Remove entry from local state
      setJournalEntries(prev => prev.filter(entry => entry.id !== entryId));
      
      // Close drawer if the deleted entry was selected
      if (selectedEntry?.id === entryId) {
        handleCloseDrawer();
      }

      toast.success(`Journal Entry ${entryNumber} has been deleted successfully.`);

    } catch (error) {
      console.error('Error deleting journal entry:', error);
      toast.error('Failed to delete journal entry. Please try again.');
    }
  }, [deleteDialog, selectedEntry, handleCloseDrawer]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({
      isOpen: false,
      entryId: "",
      entryNumber: ""
    });
  }, []);

  const handlePostEntry = useCallback(async (entryId: string) => {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('journal_entries')
        .update({ is_posted: true })
        .eq('id', entryId);

      if (error) {
        console.error('Error posting journal entry:', error);
        toast.error('Failed to post journal entry. Please try again.');
        return;
      }

      // Update local state
      setJournalEntries(prev => 
        prev.map(entry => 
          entry.id === entryId 
            ? { ...entry, is_posted: true }
            : entry
        )
      );

      toast.success('Journal entry has been posted successfully.');

    } catch (error) {
      console.error('Error posting journal entry:', error);
      toast.error('Failed to post journal entry. Please try again.');
    }
  }, []);

  const columns = useMemo<ColumnDef<JournalEntry>[]>(
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
        id: "entry",
        accessorKey: "entry_number",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Entry" />
        ),
        cell: ({ row }) => {
          const entry = row.original;
          return (
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded-lg transition-colors"
              onClick={() => handleEntryClick(entry)}
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{entry.entry_number}</div>
                <div className="text-sm text-gray-500">{entry.description || 'No description'}</div>
              </div>
            </div>
          );
        },
        meta: {
          label: "Entry",
          placeholder: "Search entries...",
          variant: "text",
          icon: FileText,
        },
        enableColumnFilter: true,
      },
      {
        id: "date",
        accessorKey: "entry_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => {
          const date = row.getValue<string>("date");
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
        id: "reference",
        accessorKey: "reference",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Reference" />
        ),
        cell: ({ row }) => {
          const reference = row.getValue<string>("reference");
          return (
            <span className="text-sm text-gray-900">
              {reference || 'No reference'}
            </span>
          );
        },
        meta: {
          label: "Reference",
          placeholder: "Search references...",
          variant: "text",
        },
        enableColumnFilter: true,
      },
      {
        id: "amount",
        accessorKey: "total_debit",
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
        accessorKey: "is_posted",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const isPosted = row.getValue<boolean>("status");
          return (
            <Badge className={isPosted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {isPosted ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Posted
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Draft
                </>
              )}
            </Badge>
          );
        },
        meta: {
          label: "Status",
          variant: "multiSelect",
          options: [
            { label: "Posted", value: "true" },
            { label: "Draft", value: "false" },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const entry = row.original;
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
                  <Link href={`/dashboard/journal-entries/${entry.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                {!entry.is_posted && (
                  <DropdownMenuItem onClick={() => handlePostEntry(entry.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Post Entry
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => handleDeleteClick(entry.id, entry.entry_number)}
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
    [handleDeleteClick, handlePostEntry]
  );

  const { table } = useDataTable({
    data: journalEntries,
    columns,
    pageCount: Math.ceil(journalEntries.length / 10),
    initialState: {
      sorting: [{ id: "entry_date", desc: true }],
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
              <h1 className="text-2xl font-medium">Journal Entries</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button asChild>
                <Link href="/dashboard/journal-entries/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Entry
                </Link>
              </Button>
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

      {/* Journal Entry Drawer */}
      <JournalEntryDrawer
        entry={selectedEntry}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onDelete={handleDeleteClick}
        onPost={handlePostEntry}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Journal Entry"
        description={`Are you sure you want to delete journal entry ${deleteDialog.entryNumber}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
