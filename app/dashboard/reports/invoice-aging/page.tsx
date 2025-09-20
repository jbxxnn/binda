"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  // Download, 
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  Loader,
  Filter,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { ExportDropdown } from "@/components/export-dropdown";
import { ExportData } from "@/lib/export-utils";

interface InvoiceAgingData {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  due_date: string;
  days_overdue: number;
  status: string;
}

interface InvoiceAgingReport {
  summary: {
    totalOutstanding: number;
    totalOverdue: number;
    overdueCount: number;
    currentCount: number;
    averageDaysOverdue: number;
  };
  agingBuckets: {
    current: InvoiceAgingData[];
    overdue30: InvoiceAgingData[];
    overdue60: InvoiceAgingData[];
    overdue90: InvoiceAgingData[];
    overdue90Plus: InvoiceAgingData[];
  };
  period: {
    start: string;
    end: string;
  };
}

export default function InvoiceAgingPage() {
  const [report, setReport] = useState<InvoiceAgingReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year' | 'all'>('3months');

  useEffect(() => {
    fetchInvoiceAgingReport();
  }, [selectedPeriod]);

  const fetchInvoiceAgingReport = async () => {
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

      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case 'all':
          startDate.setFullYear(2020);
          break;
      }

      // Fetch invoices with payment data
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          due_date,
          status,
          created_at,
          customer:customers(name)
        `)
        .eq('business_id', businesses.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('due_date', { ascending: true });

      // Fetch payment data for each invoice
      const invoiceIds = invoices?.map(inv => inv.id) || [];
      const { data: payments } = await supabase
        .from('payments')
        .select('invoice_id, amount')
        .in('invoice_id', invoiceIds);

      // Process invoice aging data
      const agingData: InvoiceAgingData[] = invoices?.map(invoice => {
        const invoicePayments = payments?.filter(p => p.invoice_id === invoice.id) || [];
        const paidAmount = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
        const outstandingAmount = invoice.total_amount - paidAmount;
        const daysOverdue = Math.max(0, Math.ceil((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)));
        
        return {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          customer_name: invoice.customer?.[0]?.name || 'No Customer',
          total_amount: invoice.total_amount,
          paid_amount: paidAmount,
          outstanding_amount: outstandingAmount,
          due_date: invoice.due_date,
          days_overdue: daysOverdue,
          status: invoice.status
        };
      }) || [];

      // Filter only outstanding invoices
      const outstandingInvoices = agingData.filter(inv => inv.outstanding_amount > 0);

      // Categorize by aging buckets
      const agingBuckets = {
        current: outstandingInvoices.filter(inv => inv.days_overdue <= 0),
        overdue30: outstandingInvoices.filter(inv => inv.days_overdue > 0 && inv.days_overdue <= 30),
        overdue60: outstandingInvoices.filter(inv => inv.days_overdue > 30 && inv.days_overdue <= 60),
        overdue90: outstandingInvoices.filter(inv => inv.days_overdue > 60 && inv.days_overdue <= 90),
        overdue90Plus: outstandingInvoices.filter(inv => inv.days_overdue > 90)
      };

      // Calculate summary
      const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.outstanding_amount, 0);
      const totalOverdue = agingBuckets.overdue30.reduce((sum, inv) => sum + inv.outstanding_amount, 0) +
                          agingBuckets.overdue60.reduce((sum, inv) => sum + inv.outstanding_amount, 0) +
                          agingBuckets.overdue90.reduce((sum, inv) => sum + inv.outstanding_amount, 0) +
                          agingBuckets.overdue90Plus.reduce((sum, inv) => sum + inv.outstanding_amount, 0);
      const overdueCount = agingBuckets.overdue30.length + agingBuckets.overdue60.length + 
                          agingBuckets.overdue90.length + agingBuckets.overdue90Plus.length;
      const currentCount = agingBuckets.current.length;
      const overdueInvoices = outstandingInvoices.filter(inv => inv.days_overdue > 0);
      const averageDaysOverdue = overdueInvoices.length > 0 
        ? overdueInvoices.reduce((sum, inv) => sum + inv.days_overdue, 0) / overdueInvoices.length 
        : 0;

      setReport({
        summary: {
          totalOutstanding,
          totalOverdue,
          overdueCount,
          currentCount,
          averageDaysOverdue
        },
        agingBuckets,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      });
    } catch (error) {
      console.error('Error fetching invoice aging report:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getAgingBucketColor = (bucket: string) => {
    switch (bucket) {
      case 'current': return 'bg-green-100 text-green-800';
      case 'overdue30': return 'bg-yellow-100 text-yellow-800';
      case 'overdue60': return 'bg-orange-100 text-orange-800';
      case 'overdue90': return 'bg-red-100 text-red-800';
      case 'overdue90Plus': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAgingBucketIcon = (bucket: string) => {
    switch (bucket) {
      case 'current': return <CheckCircle className="h-4 w-4" />;
      case 'overdue30': return <Clock className="h-4 w-4" />;
      case 'overdue60': return <AlertTriangle className="h-4 w-4" />;
      case 'overdue90': return <AlertTriangle className="h-4 w-4" />;
      case 'overdue90Plus': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const prepareExportData = (): ExportData => {
    if (!report) {
      return {
        title: 'Invoice Aging Report',
        period: 'No data available',
        summary: [],
        tables: [],
        charts: []
      };
    }

    // Flatten all aging buckets into one list
    const allInvoices = Object.entries(report.agingBuckets).flatMap(([bucket, invoices]) =>
      invoices.map(invoice => ({
        ...invoice,
        aging_bucket: bucket
      }))
    );

    return {
      title: 'Invoice Aging Report',
      period: `${report.period.start} to ${report.period.end}`,
      summary: [
        { label: 'Total Outstanding', value: report.summary.totalOutstanding },
        { label: 'Total Overdue', value: report.summary.totalOverdue },
        { label: 'Overdue Count', value: report.summary.overdueCount },
        { label: 'Current Count', value: report.summary.currentCount },
        { label: 'Average Days Overdue', value: report.summary.averageDaysOverdue }
      ],
      tables: [
        {
          title: 'Aging Summary',
          columns: [
            { key: 'bucket', label: 'Aging Bucket' },
            { key: 'count', label: 'Count' },
            { key: 'amount', label: 'Amount' }
          ],
          data: Object.entries(report.agingBuckets).map(([bucket, invoices]) => ({
            bucket: bucket === 'current' ? 'Current (0 days)' :
                   bucket === 'overdue30' ? '1-30 Days Overdue' :
                   bucket === 'overdue60' ? '31-60 Days Overdue' :
                   bucket === 'overdue90' ? '61-90 Days Overdue' :
                   '90+ Days Overdue',
            count: invoices.length,
            amount: invoices.reduce((sum, inv) => sum + inv.outstanding_amount, 0)
          }))
        },
        {
          title: 'All Outstanding Invoices',
          columns: [
            { key: 'invoice_number', label: 'Invoice #' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'total_amount', label: 'Total Amount' },
            { key: 'paid_amount', label: 'Paid Amount' },
            { key: 'outstanding_amount', label: 'Outstanding' },
            { key: 'due_date', label: 'Due Date' },
            { key: 'days_overdue', label: 'Days Overdue' },
            { key: 'aging_bucket', label: 'Aging Bucket' }
          ],
          data: allInvoices
        }
      ],
      charts: []
    };
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <Loader className="h-6 w-6 animate-spin" />
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
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/reports">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Reports
                </Link>
              </Button>
              <div className="flex items-center space-x-2">
                <Calendar className="h-6 w-6" />
                <h1 className="text-2xl font-medium">Invoice Aging Report</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <select
                  aria-label="Select Period"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as '3months' | '6months' | '1year' | 'all')}
                  className="px-3 py-1 border border-brand-tropical rounded-md text-sm"
                >
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <ExportDropdown 
                data={prepareExportData()} 
                filename={`invoice-aging-${selectedPeriod}`}
                disabled={!report}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 w-full max-w-full">
          <div className="max-w-7xl mx-auto space-y-6">
            {report && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                      <DollarSign className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(report.summary.totalOutstanding)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Overdue</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(report.summary.totalOverdue)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Overdue Count</CardTitle>
                      <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {report.summary.overdueCount}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Days Overdue</CardTitle>
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(report.summary.averageDaysOverdue)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Aging Buckets */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Object.entries(report.agingBuckets).map(([bucket, invoices]) => {
                    const bucketTotal = invoices.reduce((sum, inv) => sum + inv.outstanding_amount, 0);
                    const bucketLabels = {
                      current: 'Current (0 days)',
                      overdue30: '1-30 Days Overdue',
                      overdue60: '31-60 Days Overdue',
                      overdue90: '61-90 Days Overdue',
                      overdue90Plus: '90+ Days Overdue'
                    };

                    return (
                      <Card key={bucket}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{bucketLabels[bucket as keyof typeof bucketLabels]}</CardTitle>
                            <Badge className={getAgingBucketColor(bucket)}>
                              {getAgingBucketIcon(bucket)}
                              <span className="ml-1">{invoices.length}</span>
                            </Badge>
                          </div>
                          <CardDescription>
                            {formatCurrency(bucketTotal)} outstanding
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {invoices.slice(0, 5).map((invoice) => (
                              <div key={invoice.invoice_id} className="flex items-center justify-between p-2 border rounded">
                                <div>
                                  <div className="font-medium text-sm">{invoice.invoice_number}</div>
                                  <div className="text-xs text-muted-foreground">{invoice.customer_name}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-sm">{formatCurrency(invoice.outstanding_amount)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {invoice.days_overdue > 0 ? `${invoice.days_overdue} days` : 'Current'}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {invoices.length > 5 && (
                              <div className="text-center text-sm text-muted-foreground">
                                +{invoices.length - 5} more invoices
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Detailed Invoice List */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Outstanding Invoices</CardTitle>
                    <CardDescription>Complete list of unpaid invoices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(report.agingBuckets).flatMap(([bucket, invoices]) => 
                        invoices.map((invoice) => (
                          <div key={invoice.invoice_id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                {getAgingBucketIcon(bucket)}
                              </div>
                              <div>
                                <div className="font-medium">{invoice.invoice_number}</div>
                                <div className="text-sm text-muted-foreground">{invoice.customer_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Due: {formatDate(invoice.due_date)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{formatCurrency(invoice.outstanding_amount)}</div>
                              <div className="text-sm text-muted-foreground">
                                {invoice.days_overdue > 0 ? `${invoice.days_overdue} days overdue` : 'Current'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Paid: {formatCurrency(invoice.paid_amount)} / {formatCurrency(invoice.total_amount)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
