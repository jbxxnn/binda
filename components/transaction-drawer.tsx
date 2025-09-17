"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Edit, DollarSign, Calendar, User, CreditCard, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Transaction {
  id: string;
  business_id: string;
  customer_id?: string;
  transaction_number: string;
  type: string;
  amount: number;
  description?: string;
  status: string;
  payment_method?: string;
  notes?: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
  };
}

interface TransactionDrawerProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (transactionId: string, transactionNumber: string) => void;
}

export function TransactionDrawer({ transaction, isOpen, onClose, onDelete }: TransactionDrawerProps) {
  if (!transaction) return null;

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'refunded':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return DollarSign;
      case 'service':
        return Receipt;
      case 'refund':
        return DollarSign;
      case 'payment':
        return CreditCard;
      default:
        return DollarSign;
    }
  };

  const TypeIcon = getTypeIcon(transaction.type);

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
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <TypeIcon className="w-8 h-8 text-blue-700 dark:text-blue-300" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {transaction.transaction_number}
                    </h2>
                    <button 
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      aria-label="Edit transaction number"
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
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {transaction.type} Transaction
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-900 dark:text-white border-b-2 border-blue-500">
                  Transaction Details
                </button>
                <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Customer Info
                </button>
                <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Payment Details
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <div className="space-y-6">
                {/* Transaction Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Transaction Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                      <Badge className={`capitalize ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Type</span>
                      <span className="text-sm text-gray-900 dark:text-white capitalize">
                        {transaction.type}
                      </span>
                    </div>
                    {transaction.description && (
                      <div className="flex items-start justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Description</span>
                        <span className="text-sm text-gray-900 dark:text-white text-right max-w-[200px]">
                          {transaction.description}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Information */}
                {transaction.customer && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Customer Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{transaction.customer.name}</span>
                      </div>
                      {transaction.customer.email && (
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-400">Email:</span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">{transaction.customer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Payment Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Payment Method</span>
                      <span className="text-sm text-gray-900 dark:text-white capitalize">
                        {transaction.payment_method || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Transaction Date</span>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {formatDate(transaction.transaction_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {transaction.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Notes</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      {transaction.notes}
                    </p>
                  </div>
                )}

                {/* Transaction Metadata */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Transaction Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Created</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(transaction.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Last Updated</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(transaction.updated_at)}
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
                  <Link href={`/dashboard/transactions/${transaction.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Transaction
                  </Link>
                </Button>
                {onDelete && (
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => onDelete(transaction.id, transaction.transaction_number)}
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
