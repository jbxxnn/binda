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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader,
//   Plus,
//   Minus
} from "lucide-react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

interface Category {
  id: string;
  business_id: string;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_default?: boolean;
  is_default_active?: boolean;
}

type FormState = "idle" | "loading" | "success";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formState, setFormState] = useState<FormState>("idle");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    categoryId: string;
    categoryName: string;
  }>({
    isOpen: false,
    categoryId: "",
    categoryName: ""
  });
  const [formData, setFormData] = useState({
    name: "",
    type: "income",
    description: "",
    is_active: true
  });

  useEffect(() => {
    const fetchCategories = async () => {
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

        // Get user's active categories from database
        const { data: userCategoriesData, error } = await supabase
          .from('categories')
          .select('*')
          .eq('business_id', business.id)
          .order('type', { ascending: true })
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching categories:', error);
          setCategories([]);
        } else {
          // Merge default categories with user's active categories
          const userCategories = userCategoriesData || [];
          const defaultCategories = getDefaultCategories();
          
          // Create a map of user's active categories for quick lookup
          const userCategoryMap = new Map();
          userCategories.forEach(cat => {
            userCategoryMap.set(cat.name, cat);
          });
          
          // Merge default categories with user's status
          const mergedCategories = defaultCategories.map(defaultCat => {
            const userCat = userCategoryMap.get(defaultCat.name);
            return {
              ...defaultCat,
              id: userCat?.id || `default-${defaultCat.id}`,
              business_id: business.id,
              is_active: userCat ? userCat.is_active : defaultCat.is_default_active || false,
              created_at: userCat?.created_at || '',
              updated_at: userCat?.updated_at || '',
              is_default: true
            };
          });
          
          // Add user's custom categories (not in default list)
          const customCategories = userCategories.filter(userCat => 
            !defaultCategories.some(defaultCat => defaultCat.name === userCat.name)
          ).map(cat => ({
            ...cat,
            is_default: false
          }));
          
          setCategories([...mergedCategories, ...customCategories]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getDefaultCategories = (): Category[] => [
    // Income Categories - Essential ones enabled by default
    { id: '1', business_id: '', name: 'Sales Revenue', type: 'income', description: 'Money from selling products or services', is_active: true, created_at: '', updated_at: '', is_default_active: true },
    { id: '2', business_id: '', name: 'Service Revenue', type: 'income', description: 'Money from providing services', is_active: true, created_at: '', updated_at: '', is_default_active: true },
    { id: '3', business_id: '', name: 'Product Sales', type: 'income', description: 'Money from selling physical products', is_active: false, created_at: '', updated_at: '', is_default_active: false },
    { id: '4', business_id: '', name: 'Consulting', type: 'income', description: 'Money from consulting services', is_active: false, created_at: '', updated_at: '', is_default_active: false },
    { id: '5', business_id: '', name: 'Other Income', type: 'income', description: 'Other sources of income', is_active: true, created_at: '', updated_at: '', is_default_active: true },
    
    // Expense Categories - Essential ones enabled by default
    { id: '6', business_id: '', name: 'Rent & Utilities', type: 'expense', description: 'Office rent, electricity, water, internet', is_active: true, created_at: '', updated_at: '', is_default_active: true },
    { id: '7', business_id: '', name: 'Supplies & Inventory', type: 'expense', description: 'Office supplies, raw materials, inventory', is_active: true, created_at: '', updated_at: '', is_default_active: true },
    { id: '8', business_id: '', name: 'Staff & Payroll', type: 'expense', description: 'Employee salaries, benefits, contractors', is_active: false, created_at: '', updated_at: '', is_default_active: false },
    { id: '9', business_id: '', name: 'Marketing & Advertising', type: 'expense', description: 'Ads, social media, promotional materials', is_active: false, created_at: '', updated_at: '', is_default_active: false },
    { id: '10', business_id: '', name: 'Equipment & Tools', type: 'expense', description: 'Computers, machinery, tools, software', is_active: false, created_at: '', updated_at: '', is_default_active: false },
    { id: '11', business_id: '', name: 'Insurance', type: 'expense', description: 'Business insurance, liability coverage', is_active: false, created_at: '', updated_at: '', is_default_active: false },
    { id: '12', business_id: '', name: 'Professional Services', type: 'expense', description: 'Accountant, lawyer, consultant fees', is_active: false, created_at: '', updated_at: '', is_default_active: false },
    { id: '13', business_id: '', name: 'Other Expenses', type: 'expense', description: 'Miscellaneous business expenses', is_active: true, created_at: '', updated_at: '', is_default_active: true },
  ];

  // const createDefaultCategories = async (businessId: string) => {
  //   try {
  //     const supabase = createClient();
  //     const defaultCategories = getDefaultCategories().map(cat => ({
  //       ...cat,
  //       business_id: businessId
  //     }));

  //     const { error } = await supabase
  //       .from('categories')
  //       .insert(defaultCategories);

  //     if (error) {
  //       console.error('Error creating default categories:', error);
  //     }
  //   } catch (error) {
  //     console.error('Error creating default categories:', error);
  //   }
  // };

  const getCategoryIcon = (type: string) => {
    return type === 'income' ? TrendingUp : TrendingDown;
  };

  const getCategoryColor = (type: string) => {
    return type === 'income' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  };

  const handleCategoryToggle = async (category: Category) => {
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

      if (category.is_active) {
        // Deactivate category - delete from database
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', category.id);

        if (error) {
          console.error('Error deactivating category:', error);
          toast.error('Failed to deactivate category. Please try again.');
          return;
        }

        // Update local state
        setCategories(prev => prev.map(cat => 
          cat.id === category.id ? { ...cat, is_active: false } : cat
        ));

        toast.success(`${category.name} has been deactivated.`);
      } else {
        // Activate category - insert into database
        const { error } = await supabase
          .from('categories')
          .insert({
            business_id: business.id,
            name: category.name,
            type: category.type,
            description: category.description || null,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          console.error('Error activating category:', error);
          toast.error('Failed to activate category. Please try again.');
          return;
        }

        // Update local state with the new database ID
        setCategories(prev => prev.map(cat => 
          cat.id === category.id ? { ...cat, is_active: true } : cat
        ));

        toast.success(`${category.name} has been activated.`);
      }
    } catch (error) {
      console.error('Error toggling category:', error);
      toast.error('Failed to toggle category. Please try again.');
    }
  };

  const handleCategoryClick = (category: Category) => {
    // Toggle category on click
    handleCategoryToggle(category);
  };

  const handleDeleteClick = useCallback((categoryId: string, categoryName: string) => {
    setDeleteDialog({
      isOpen: true,
      categoryId,
      categoryName
    });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const { categoryId, categoryName } = deleteDialog;
    
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) {
        console.error('Error deleting category:', error);
        toast.error('Failed to delete category. Please try again.');
        return;
      }

      // Remove category from local state
      setCategories(prev => prev.filter(category => category.id !== categoryId));

      toast.success(`${categoryName} has been deleted successfully.`);

    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category. Please try again.');
    }
  }, [deleteDialog]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({
      isOpen: false,
      categoryId: "",
      categoryName: ""
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

      // Create custom category
      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert({
          business_id: business.id,
          name: formData.name,
          type: formData.type,
          description: formData.description || null,
          is_active: true, // Custom categories are always active when created
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating category:', error);
        toast.error('Failed to create category. Please try again.');
        setFormState("idle");
        return;
      }

      // Add new custom category to the list
      const customCategory = { ...newCategory, is_default: false };
      setCategories(prev => [customCategory, ...prev]);
      
      setFormState("success");
      toast.success(`${formData.name} has been added successfully.`);
      
      // Reset form and close after success
      setTimeout(() => {
        setIsFormOpen(false);
        setFormState("idle");
        setFormData({
          name: "",
          type: "income",
          description: "",
          is_active: true
        });
      }, 2000);

    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category. Please try again.');
      setFormState("idle");
    }
  };

  const columns = useMemo<ColumnDef<Category>[]>(
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
        id: "category",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Category" />
        ),
        cell: ({ row }) => {
          const category = row.original;
          const Icon = getCategoryIcon(category.type);
          return (
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded-lg transition-colors"
              onClick={() => handleCategoryClick(category)}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                category.type === 'income' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Icon className={`w-4 h-4 ${
                  category.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-gray-900">{category.name}</div>
                  {category.is_default && (
                    <Badge variant="outline" className="text-xs">
                      Default
                    </Badge>
                  )}
                  {category.is_default_active && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      Auto-enabled
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-500">{category.description || 'No description'}</div>
              </div>
              <div className="flex items-center">
                <div className={`w-12 h-6 rounded-full transition-colors ${
                  category.is_active ? 'bg-teal-500' : 'bg-gray-300'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    category.is_active ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </div>
              </div>
            </div>
          );
        },
        meta: {
          label: "Category",
          placeholder: "Search categories...",
          variant: "text",
          icon: DollarSign,
        },
        enableColumnFilter: true,
      },
      {
        id: "type",
        accessorKey: "type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => {
          const type = row.getValue<string>("type");
          return (
            <Badge className={`capitalize ${getCategoryColor(type)}`}>
              {type === 'income' ? (
                <>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Money In
                </>
              ) : (
                <>
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Money Out
                </>
              )}
            </Badge>
          );
        },
        meta: {
          label: "Type",
          variant: "multiSelect",
          options: [
            { label: "Money In", value: "income", icon: TrendingUp },
            { label: "Money Out", value: "expense", icon: TrendingDown },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const category = row.original;
          
          // Only show actions for custom categories (not default ones)
          if (category.is_default) {
            return null;
          }
          
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
                  <Link href={`/dashboard/categories/${category.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => handleDeleteClick(category.id, category.name)}
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
    data: categories,
    columns,
    pageCount: Math.ceil(categories.length / 10),
    initialState: {
      sorting: [{ id: "type", desc: false }],
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
       <Loader className="h-8 w-8 animate-spin" />
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
              <h1 className="text-2xl font-medium">Categories</h1>
            </div>
            <div className="flex items-center space-x-4">
              <PopoverForm
                title="Add Category"
                open={isFormOpen}
                setOpen={setIsFormOpen}
                width="400px"
                height="auto"
                showCloseButton={formState !== "success"}
                showSuccess={formState === "success"}
                openChild={
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>Create Custom Category:</strong> Add your own category that will be available only to your business.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Hair Services, Office Supplies"
                        className="w-full px-3 py-2 border border-brand-tropical rounded-md shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-muted-foreground">
                        Category Type
                      </label>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant={formData.type === 'income' ? 'default' : 'outline'}
                          onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
                          className="flex-1"
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Money In
                        </Button>
                        <Button
                          type="button"
                          variant={formData.type === 'expense' ? 'default' : 'outline'}
                          onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
                          className="flex-1"
                        >
                          <TrendingDown className="w-4 h-4 mr-2" />
                          Money Out
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="description" className="block text-sm font-medium text-muted-foreground">
                        Description
                      </label>
                      <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of this category..."
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
                        Active Category
                      </label>
                    </div>

                    <PopoverFormButton
                      loading={formState === "loading"}
                      text="Add Category"
                    />
                  </form>
                }
                successChild={
                  <PopoverFormSuccess
                    title="Category Added!"
                    description="Your new category has been created successfully."
                  />
                }
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto p-6 w-full max-w-full">
          <div className="data-table-container w-full max-w-full min-w-0 overflow-x-auto">
          <div className="text-sm text-gray-600">
                Toggle default categories on/off or create your own
              </div>
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
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteDialog.categoryName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
