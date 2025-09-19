"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PieChart, Pie, Cell, ResponsiveContainer, 
  // BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip } from "recharts"
import { 
  DollarSign, 
  CreditCard, 
  Clock, 
  TrendingUp,
  AlertCircle,
  CheckCircle
} from "lucide-react"

interface PaymentMethodData {
  name: string
  value: number
  color: string
}

interface PaymentAnalytics {
  totalPayments: number
  totalAmount: number
  averagePaymentTime: number
  collectionRate: number
  paymentMethods: PaymentMethodData[]
  recentPayments: Array<{
    id: string
    amount: number
    payment_date: string
    payment_method: string
    invoice_number: string
  }>
  overdueInvoices: Array<{
    id: string
    invoice_number: string
    total_amount: number
    due_date: string
    days_overdue: number
  }>
}

interface PaymentAnalyticsProps {
  selectedDate: Date
  timePeriod: 'day' | 'week' | 'month' | 'year'
}

export function PaymentAnalytics({ selectedDate, timePeriod }: PaymentAnalyticsProps) {
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPaymentAnalytics()
  }, [selectedDate, timePeriod])

  const fetchPaymentAnalytics = async () => {
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

      // Calculate date range based on time period
      const startDate = getPeriodStart(selectedDate, timePeriod)
      const endDate = getPeriodEnd(selectedDate, timePeriod)

      // Fetch payments for the period
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method:payment_methods(name),
          invoice:invoices(invoice_number, due_date, total_amount)
        `)
        .eq('business_id', businesses.id)
        .gte('payment_date', startDate.toISOString().split('T')[0])
        .lte('payment_date', endDate.toISOString().split('T')[0])
        .order('payment_date', { ascending: false })

      // Fetch overdue invoices
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, due_date')
        .eq('business_id', businesses.id)
        .eq('status', 'sent')
        .lt('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true })

      // Process payment methods data
      const paymentMethodMap = new Map<string, number>()
      payments?.forEach(payment => {
        const method = payment.payment_method?.[0]?.name || 'Unknown'
        paymentMethodMap.set(method, (paymentMethodMap.get(method) || 0) + payment.amount)
      })

      const paymentMethods: PaymentMethodData[] = Array.from(paymentMethodMap.entries()).map(([name, value], index) => ({
        name,
        value,
        color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
      }))

      // Calculate metrics
      const totalAmount = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
      const totalPayments = payments?.length || 0
      
      // Calculate average payment time (simplified - days from invoice to payment)
      const paymentTimes = payments?.map(payment => {
        const invoice = payment.invoice?.[0]
        if (!invoice?.due_date) return 0
        const invoiceDate = new Date(invoice.due_date)
        const paymentDate = new Date(payment.payment_date)
        return Math.max(0, paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      }).filter(time => time > 0) || []
      
      const averagePaymentTime = paymentTimes.length > 0 
        ? paymentTimes.reduce((sum, time) => sum + time, 0) / paymentTimes.length 
        : 0

      // Calculate collection rate (simplified)
      const collectionRate = 85 // This would need more complex logic based on invoice due dates

      // Process recent payments
      const recentPayments = payments?.slice(0, 5).map(payment => ({
        id: payment.id,
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method?.[0]?.name || 'Unknown',
        invoice_number: payment.invoice?.[0]?.invoice_number || 'N/A'
      })) || []

      // Process overdue invoices
      const overdueInvoicesData = overdueInvoices?.map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        due_date: invoice.due_date,
        days_overdue: Math.ceil((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
      })) || []

      setAnalytics({
        totalPayments,
        totalAmount,
        averagePaymentTime,
        collectionRate,
        paymentMethods,
        recentPayments,
        overdueInvoices: overdueInvoicesData
      })
    } catch (error) {
      console.error('Error fetching payment analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPeriodStart = (date: Date, period: 'day' | 'week' | 'month' | 'year') => {
    const start = new Date(date)
    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0)
        return start
      case 'week':
        const dayOfWeek = start.getDay()
        start.setDate(start.getDate() - dayOfWeek)
        start.setHours(0, 0, 0, 0)
        return start
      case 'month':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        return start
      case 'year':
        start.setMonth(0, 1)
        start.setHours(0, 0, 0, 0)
        return start
    }
  }

  const getPeriodEnd = (date: Date, period: 'day' | 'week' | 'month' | 'year') => {
    const end = new Date(date)
    switch (period) {
      case 'day':
        end.setHours(23, 59, 59, 999)
        return end
      case 'week':
        const dayOfWeek = end.getDay()
        end.setDate(end.getDate() + (6 - dayOfWeek))
        end.setHours(23, 59, 59, 999)
        return end
      case 'month':
        end.setMonth(end.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
        return end
      case 'year':
        end.setMonth(11, 31)
        end.setHours(23, 59, 59, 999)
        return end
    }
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
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Payment Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold">{analytics.totalPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Amount Collected</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Payment Time</p>
                <p className="text-2xl font-bold">{analytics.averagePaymentTime.toFixed(0)} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Collection Rate</p>
                <p className="text-2xl font-bold">{analytics.collectionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Chart and Recent Payments */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Payment Methods Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.paymentMethods.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.paymentMethods}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analytics.paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {analytics.paymentMethods.map((method) => (
                    <div key={method.name} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: method.color }}
                        />
                        <span className="text-sm">{method.name}</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(method.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No payment data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.recentPayments.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 text-gray-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium">#{payment.invoice_number}</p>
                        <p className="text-xs text-gray-500">{payment.payment_method}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-gray-500">{formatDate(payment.payment_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No recent payments
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Invoices */}
      {analytics.overdueInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              Overdue Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.overdueInvoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium">#{invoice.invoice_number}</p>
                      <p className="text-xs text-gray-500">Due: {formatDate(invoice.due_date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(invoice.total_amount)}</p>
                    <Badge variant="destructive" className="text-xs">
                      {invoice.days_overdue} days overdue
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
