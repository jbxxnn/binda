"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { DollarSign, 
    // Calendar, CreditCard, 
    Loader } from "lucide-react"

interface PaymentMethod {
  id: string
  name: string
  description?: string
}

interface PaymentFormProps {
  invoiceId: string
  invoiceNumber: string
  totalAmount: number
  remainingBalance: number
  onPaymentRecorded: () => void
  onClose: () => void
}

export function PaymentForm({
  invoiceId,
  invoiceNumber,
  totalAmount,
  remainingBalance,
  onPaymentRecorded,
  onClose
}: PaymentFormProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    amount: "",
    paymentMethodId: "",
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: "",
    notes: ""
  })

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  const fetchPaymentMethods = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!businesses) return

      const { data: methods } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('business_id', businesses.id)
        .eq('is_active', true)
        .order('name')

      setPaymentMethods(methods || [])
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!businesses) return

      const paymentAmount = parseFloat(formData.amount)
      if (paymentAmount <= 0) {
        toast.error('Payment amount must be greater than 0')
        return
      }

      if (paymentAmount > remainingBalance) {
        toast.error('Payment amount cannot exceed remaining balance')
        return
      }

      // Record the payment
      const { error } = await supabase
        .from('payments')
        .insert({
          business_id: businesses.id,
          invoice_id: invoiceId,
          payment_method_id: formData.paymentMethodId,
          amount: paymentAmount,
          payment_date: formData.paymentDate,
          reference_number: formData.referenceNumber || null,
          notes: formData.notes || null
        })

      if (error) {
        console.error('Error recording payment:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        toast.error(`Failed to record payment: ${error.message || 'Unknown error'}`)
        return
      }

      toast.success('Payment recorded successfully!')
      onPaymentRecorded()
      onClose()
    } catch (error) {
      console.error('Error recording payment:', error)
      toast.error('Failed to record payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Record Payment
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Invoice #{invoiceNumber}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Summary */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Total Amount:</span>
              <span className="font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Remaining:</span>
              <span className="font-medium text-green-600">{formatCurrency(remainingBalance)}</span>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={remainingBalance}
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select
              value={formData.paymentMethodId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethodId: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date *</Label>
            <Input
              id="paymentDate"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
              required
            />
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              value={formData.referenceNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
              placeholder="Check number, transaction ID, etc."
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this payment..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                'Record Payment'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
