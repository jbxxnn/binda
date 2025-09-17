"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus,
     // Minus, DollarSign, Loader, 
     X } from "lucide-react";
import Link from "next/link";

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface JournalEntryLine {
  id: string;
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
}

export default function NewJournalEntryPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entryLines, setEntryLines] = useState<JournalEntryLine[]>([
    { id: '1', account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
    { id: '2', account_id: '', description: '', debit_amount: 0, credit_amount: 0 }
  ]);
  const [formData, setFormData] = useState({
    entry_number: '',
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    reference: ''
  });
  const router = useRouter();

  useEffect(() => {
    const fetchAccounts = async () => {
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

        // Get accounts for this business
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('id, account_code, account_name, account_type')
          .eq('business_id', businesses.id)
          .eq('is_active', true)
          .order('account_code');

        setAccounts(accountsData || []);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      }
    };

    fetchAccounts();
  }, []);

  const addEntryLine = () => {
    const newId = (entryLines.length + 1).toString();
    setEntryLines([...entryLines, { 
      id: newId, 
      account_id: '', 
      description: '', 
      debit_amount: 0, 
      credit_amount: 0 
    }]);
  };

  const removeEntryLine = (id: string) => {
    if (entryLines.length > 2) {
      setEntryLines(entryLines.filter(line => line.id !== id));
    }
  };

  const updateEntryLine = (id: string, field: keyof JournalEntryLine, value: string | number) => {
    setEntryLines(entryLines.map(line => 
      line.id === id 
        ? { ...line, [field]: value }
        : line
    ));
  };

  const calculateTotals = () => {
    const totalDebit = entryLines.reduce((sum, line) => sum + line.debit_amount, 0);
    const totalCredit = entryLines.reduce((sum, line) => sum + line.credit_amount, 0);
    return { totalDebit, totalCredit };
  };

  const isBalanced = () => {
    const { totalDebit, totalCredit } = calculateTotals();
    return Math.abs(totalDebit - totalCredit) < 0.01; // Allow for small rounding differences
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!isBalanced()) {
      setError('Journal entry must be balanced (total debits must equal total credits)');
      setIsLoading(false);
      return;
    }

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

      // Generate entry number if not provided
      const entryNumber = formData.entry_number || `JE-${Date.now()}`;

      const { totalDebit, totalCredit } = calculateTotals();

      // Create journal entry
      const { data: journalEntry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          business_id: business.id,
          entry_number: entryNumber,
          entry_date: formData.entry_date,
          description: formData.description || null,
          reference: formData.reference || null,
          total_debit: totalDebit,
          total_credit: totalCredit,
          is_posted: false
        })
        .select()
        .single();

      if (entryError) {
        throw entryError;
      }

      // Create journal entry lines
      const linesToInsert = entryLines
        .filter(line => line.account_id && (line.debit_amount > 0 || line.credit_amount > 0))
        .map((line, index) => ({
          journal_entry_id: journalEntry.id,
          account_id: line.account_id,
          line_number: index + 1,
          description: line.description || null,
          debit_amount: line.debit_amount,
          credit_amount: line.credit_amount
        }));

      if (linesToInsert.length > 0) {
        const { error: linesError } = await supabase
          .from('journal_entry_lines')
          .insert(linesToInsert);

        if (linesError) {
          throw linesError;
        }
      }

      toast.success('Journal entry created successfully!');
      router.push('/dashboard/journal-entries');

    } catch (error) {
      console.error('Error creating journal entry:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create journal entry');
      setError(error instanceof Error ? error.message : 'Failed to create journal entry');
    } finally {
      setIsLoading(false);
    }
  };

  const { totalDebit, totalCredit } = calculateTotals();

  return (
    <div className="flex flex-1 h-full relative w-full max-w-full overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full max-w-full min-w-0">
        {/* Page Header */}
        <div className="px-6 py-4 border-b bg-brand-lightning">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/journal-entries">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-medium">New Journal Entry</h1>
                <p className="text-sm text-muted-foreground">
                  Create a new journal entry with debits and credits
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto p-6 w-full max-w-full">
          <div className="max-w-4xl mx-auto w-full max-w-full min-w-0">
            <form onSubmit={handleSubmit} className="space-y-8 w-full max-w-full">
              {/* Entry Header */}
              <div className="bg-white dark:bg-gray-900 rounded-sm border border-brand-snowman p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Entry Information</h3>
                <div className="grid gap-6 md:grid-cols-2 w-full">
                  <div className="space-y-2">
                    <label htmlFor="entry_number" className="block text-sm font-medium text-muted-foreground">
                      Entry Number
                    </label>
                    <input
                      id="entry_number"
                      type="text"
                      value={formData.entry_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, entry_number: e.target.value }))}
                      placeholder="Auto-generated if empty"
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="entry_date" className="block text-sm font-medium text-muted-foreground">
                      Entry Date *
                    </label>
                    <input
                      id="entry_date"
                      type="date"
                      value={formData.entry_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2 w-full mt-6">
                  <div className="space-y-2">
                    <label htmlFor="description" className="block text-sm font-medium text-muted-foreground">
                      Description
                    </label>
                    <input
                      id="description"
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the transaction"
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="reference" className="block text-sm font-medium text-muted-foreground">
                      Reference
                    </label>
                    <input
                      id="reference"
                      type="text"
                      value={formData.reference}
                      onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                      placeholder="Invoice number, check number, etc."
                      className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                    />
                  </div>
                </div>
              </div>

              {/* Entry Lines */}
              <div className="bg-white dark:bg-gray-900 rounded-sm border border-brand-snowman p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Entry Lines</h3>
                  <Button type="button" onClick={addEntryLine} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {entryLines.map((line) => (
                    <div key={line.id} className="grid gap-4 md:grid-cols-6 items-end p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Account *
                        </label>
                        <select
                          title="Account"
                          value={line.account_id}
                          onChange={(e) => updateEntryLine(line.id, 'account_id', e.target.value)}
                          className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                          required
                        >
                          <option value="">Select Account</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.account_code} - {account.account_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateEntryLine(line.id, 'description', e.target.value)}
                          placeholder="Line description"
                          className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Debit
                        </label>
                        <input
                          type="number"
                          title="Debit"
                          step="0.01"
                          min="0"
                          value={line.debit_amount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateEntryLine(line.id, 'debit_amount', value);
                            if (value > 0) {
                              updateEntryLine(line.id, 'credit_amount', 0);
                            }
                          }}
                          className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Credit
                          </label>
                          <input
                            type="number"
                            title="Credit"
                            step="0.01"
                            min="0"
                            value={line.credit_amount}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              updateEntryLine(line.id, 'credit_amount', value);
                              if (value > 0) {
                                updateEntryLine(line.id, 'debit_amount', 0);
                              }
                            }}
                            className="w-full px-3 py-2 border border-brand-tropical rounded-sm shadow-sm focus:outline-none focus:ring-brand-tropical focus:border-brand-tropical"
                          />
                        </div>
                        {entryLines.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEntryLine(line.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-white dark:bg-gray-900 rounded-sm border border-brand-snowman p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Entry Totals</h3>
                <div className="grid gap-4 md:grid-cols-3 w-full">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Debit</div>
                    <div className="text-lg font-semibold text-green-600">
                      {totalDebit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Credit</div>
                    <div className="text-lg font-semibold text-red-600">
                      {totalCredit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Balance</div>
                    <div className={`text-lg font-semibold ${
                      isBalanced() ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isBalanced() ? 'Balanced' : 'Out of Balance'}
                    </div>
                  </div>
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
                <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
                  <Link href="/dashboard/journal-entries">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Link>
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !isBalanced()}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-sm w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Creating..." : "Create Entry"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
