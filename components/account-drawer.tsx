"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Edit, DollarSign, TrendingUp, TrendingDown, Building2, CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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

interface AccountDrawerProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (accountId: string, accountName: string) => void;
}

export function AccountDrawer({ account, isOpen, onClose, onDelete }: AccountDrawerProps) {
  if (!account) return null;

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'asset':
        return Building2;
      case 'liability':
        return CreditCard;
      case 'equity':
        return TrendingUp;
      case 'revenue':
        return TrendingUp;
      case 'expense':
        return TrendingDown;
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

  const TypeIcon = getAccountTypeIcon(account.account_type);

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
            {/* Profile Section */}
            <div className="relative p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <TypeIcon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                    account.is_active ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {account.account_code}
                    </h2>
                    <button 
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      aria-label="Edit account code"
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
                    {account.account_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-900 dark:text-white border-b-2 border-blue-500">
                  Account Details
                </button>
                <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Transactions
                </button>
                <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Reports
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <div className="space-y-6">
                {/* Account Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Account Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Account Code</span>
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {account.account_code}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Account Name</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {account.account_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Type</span>
                      <Badge className={`capitalize ${getAccountTypeColor(account.account_type)}`}>
                        {account.account_type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                      <Badge className={account.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Parent Account */}
                {account.parent_account && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Parent Account</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {account.parent_account.account_name}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                {account.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Description</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      {account.description}
                    </p>
                  </div>
                )}

                {/* Account Type Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Account Type Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Normal Balance</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {account.account_type === 'asset' || account.account_type === 'expense' ? 'Debit' : 'Credit'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Financial Statement</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {account.account_type === 'asset' || account.account_type === 'liability' || account.account_type === 'equity' 
                          ? 'Balance Sheet' 
                          : 'Income Statement'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Metadata */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Account Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Created</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(account.created_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Last Updated</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(account.updated_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
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
                  <Link href={`/dashboard/accounts/${account.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Account
                  </Link>
                </Button>
                {onDelete && (
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => onDelete(account.id, account.account_name)}
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
