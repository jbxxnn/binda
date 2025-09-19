"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PaymentForm } from "@/components/payment-form"
import { toast } from "sonner"
import { 
  DollarSign, 
//   Calendar, 
//   CreditCard, 
  Plus, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Loader
} from "lucide-react"

interface Payment {
  id: string
  amount: number
  payment_date: string
  reference_number?: string
  notes?: string
  payment_method: {
    name: string
  }
  created_at: string
}

interface PaymentSummary {
  total_amount: number
  total_paid: number
  remaining_balance: number
  payment_count: number
  status: string
}

interface PaymentHistoryProps {
  invoiceId: string
  invoiceNumber: string
  totalAmount: number
}

export function PaymentHistory({ invoiceId, invoiceNumber, totalAmount }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  useEffect(() => {
    fetchPaymentData()
  }, [invoiceId])

  const fetchPaymentData = async () => {
    try {
      const supabase = createClient()
      
      // Fetch payment summary
      const { data: summary } = await supabase
        .rpc('get_invoice_payment_summary', { invoice_uuid: invoiceId })
        .single()

      setPaymentSummary(summary as PaymentSummary)

      // Fetch payment history
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          reference_number,
          notes,
          created_at,
          payment_method:payment_methods(name)
        `)
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false })

      setPayments((paymentsData || []) as unknown as Payment[])
    } catch (error) {
      console.error('Error fetching payment data:', error)
      toast.error('Failed to load payment history')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentRecorded = () => {
    fetchPaymentData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'partially_paid':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(paymentSummary.total_amount)}</div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(paymentSummary.total_paid)}</div>
                <div className="text-sm text-muted-foreground">Total Paid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(paymentSummary.remaining_balance)}</div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {getStatusIcon(paymentSummary.status)}
                  <Badge className={getStatusColor(paymentSummary.status)}>
                    {paymentSummary.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {paymentSummary.payment_count} payment{paymentSummary.payment_count !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Payment History</h3>
        {paymentSummary && paymentSummary.remaining_balance > 0 && (
          <Button onClick={() => setShowPaymentForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        )}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && paymentSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <PaymentForm
              invoiceId={invoiceId}
              invoiceNumber={invoiceNumber}
              totalAmount={totalAmount}
              remainingBalance={paymentSummary.remaining_balance}
              onPaymentRecorded={handlePaymentRecorded}
              onClose={() => setShowPaymentForm(false)}
            />
          </div>
        </div>
      )}

      {/* Payment History List */}
      <Card>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No payments recorded yet
            </div>
          ) : (
            <div className="divide-y">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">{formatCurrency(payment.amount)}</div>
                        <div className="text-sm text-muted-foreground">
                          {payment.payment_method.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatDate(payment.payment_date)}</div>
                      {payment.reference_number && (
                        <div className="text-xs text-muted-foreground">
                          Ref: {payment.reference_number}
                        </div>
                      )}
                    </div>
                  </div>
                  {payment.notes && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {payment.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
