"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Edit, MoreVertical, Phone, Mail, MapPin, Calendar, User, Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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

interface CustomerDrawerProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (customerId: string, customerName: string) => void;
}

export function CustomerDrawer({ customer, isOpen, onClose, onDelete }: CustomerDrawerProps) {
  if (!customer) return null;

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
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
            className="fixed right-0 top-0 h-full w-full sm:w-96 z-50 bg-white dark:bg-gray-900 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
              <button 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Section */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-semibold text-teal-700 dark:text-teal-300">
                      {getInitials(customer.name)}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {customer.name}
                    </h2>
                    <button 
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      aria-label="Edit customer name"
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {customer.customer_type === "business" ? "Business Customer" : "Individual Customer"}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-900 dark:text-white border-b-2 border-teal-500">
                  Basic Information
                </button>
                <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Contacts
                </button>
                <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Activities
                </button>
                <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Tasks
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <div className="space-y-6">
                {/* Contact Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    {customer.email && (
                      <div className="flex items-center space-x-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{customer.phone}</span>
                      </div>
                    )}
                    {(customer.city || customer.state) && (
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {customer.city && customer.state 
                            ? `${customer.city}, ${customer.state}` 
                            : customer.city || customer.state || 'Not specified'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Type */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Customer Type</h3>
                  <Badge variant="outline" className="capitalize">
                    {customer.customer_type === "business" ? (
                      <>
                        <Building2 className="w-3 h-3 mr-1" />
                        Business
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3 mr-1" />
                        Individual
                      </>
                    )}
                  </Badge>
                </div>

                {/* Created Date */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Member Since</h3>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(customer.created_at)}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {customer.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Notes</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      {customer.notes}
                    </p>
                  </div>
                )}

                {/* Address */}
                {customer.address && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Address</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p>{customer.address}</p>
                      {customer.city && customer.state && (
                        <p>{customer.city}, {customer.state} {customer.zip_code}</p>
                      )}
                      {customer.country && <p>{customer.country}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href={`/dashboard/customers/${customer.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Customer
                  </Link>
                </Button>
                {onDelete && (
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => onDelete(customer.id, customer.name)}
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
