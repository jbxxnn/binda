"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Edit, FileText, 
    // Calendar, 
    DollarSign, CheckCircle, XCircle, Trash2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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

interface JournalEntryDrawerProps {
  entry: JournalEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (entryId: string, entryNumber: string) => void;
  onPost?: (entryId: string) => void;
}

export function JournalEntryDrawer({ entry, isOpen, onClose, onDelete, onPost }: JournalEntryDrawerProps) {
  if (!entry) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'asset':
        return Plus;
      case 'liability':
        return Minus;
      case 'equity':
        return Plus;
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

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 200,
              duration: 0.3
            }}
            className="fixed right-0 top-0 h-full w-[90%] sm:w-96 z-50 bg-white dark:bg-gray-900 shadow-2xl flex flex-col"
          >
            {/* Header Section */}
            <div className="relative p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-blue-700 dark:text-blue-300" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                    entry.is_posted ? 'bg-green-500' : 'bg-yellow-500'
                  }`}>
                    {entry.is_posted ? (
                      <CheckCircle className="w-3 h-3 text-white" />
                    ) : (
                      <XCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {entry.entry_number}
                    </h2>
                    <button 
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      aria-label="Edit entry number"
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                      onClick={onClose}
                      className="absolute -left-6 top-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-10"
                      aria-label="Close drawer"
                    >
                      <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {entry.description || 'No description'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-900 dark:text-white border-b-2 border-blue-500">
                  Entry Details
                </button>
                <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Lines
                </button>
                <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Reports
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <div className="space-y-6">
                {/* Entry Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Entry Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Entry Number</span>
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {entry.entry_number}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Date</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatDate(entry.entry_date)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Reference</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {entry.reference || 'No reference'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                      <Badge className={entry.is_posted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {entry.is_posted ? (
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
                    </div>
                  </div>
                </div>

                {/* Amounts */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Amounts</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Total Debit</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(entry.total_debit)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Total Credit</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(entry.total_credit)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Balance</span>
                      <span className={`text-sm font-semibold ${
                        entry.total_debit === entry.total_credit 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {entry.total_debit === entry.total_credit ? 'Balanced' : 'Out of Balance'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Journal Entry Lines */}
                {entry.journal_entry_lines && entry.journal_entry_lines.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Entry Lines</h3>
                    <div className="space-y-3">
                      {entry.journal_entry_lines
                        .sort((a, b) => a.line_number - b.line_number)
                        .map((line) => {
                          const TypeIcon = getAccountTypeIcon(line.account?.account_type || '');
                          return (
                            <div key={line.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <TypeIcon className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {line.account?.account_code} - {line.account?.account_name}
                                  </span>
                                  <Badge className={`text-xs ${getAccountTypeColor(line.account?.account_type || '')}`}>
                                    {line.account?.account_type}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  {line.debit_amount > 0 && (
                                    <span className="text-sm font-medium text-green-600">
                                      Dr: {formatCurrency(line.debit_amount)}
                                    </span>
                                  )}
                                  {line.credit_amount > 0 && (
                                    <span className="text-sm font-medium text-red-600">
                                      Cr: {formatCurrency(line.credit_amount)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {line.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {line.description}
                                </p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Entry Metadata */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Entry Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Created</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Last Updated</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(entry.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href={`/dashboard/journal-entries/${entry.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Entry
                  </Link>
                </Button>
                {!entry.is_posted && onPost && (
                  <Button 
                    className="flex-1"
                    onClick={() => onPost(entry.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Post Entry
                  </Button>
                )}
                {onDelete && (
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => onDelete(entry.id, entry.entry_number)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
