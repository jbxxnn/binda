"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  Calendar,
  Download,
  Eye,
  ArrowRight,
  Loader
} from "lucide-react";
import Link from "next/link";

interface ReportSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingInvoices: number;
  overdueInvoices: number;
  totalCustomers: number;
}

export default function ReportsPage() {
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportSummary();
  }, []);

  const fetchReportSummary = async () => {
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

      // Fetch summary data
      const { data: revenueData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('business_id', businesses.id)
        .eq('type', 'income');

      const { data: expenseData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('business_id', businesses.id)
        .eq('type', 'expense');

      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('total_amount, status, due_date')
        .eq('business_id', businesses.id);

      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', businesses.id);

      // Calculate summary
      const totalRevenue = revenueData?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpenses = expenseData?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const netProfit = totalRevenue - totalExpenses;
      
      const outstandingInvoices = invoiceData?.filter(i => i.status === 'sent').length || 0;
      const overdueInvoices = invoiceData?.filter(i => 
        i.status === 'sent' && new Date(i.due_date) < new Date()
      ).length || 0;
      
      const totalCustomers = customerData?.length || 0;

      setReportSummary({
        totalRevenue,
        totalExpenses,
        netProfit,
        outstandingInvoices,
        overdueInvoices,
        totalCustomers
      });
    } catch (error) {
      console.error('Error fetching report summary:', error);
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

  const reports = [
    {
      title: "Profit & Loss Statement",
      description: "Revenue, expenses, and net profit over time",
      icon: TrendingUp,
      href: "/dashboard/reports/profit-loss",
      color: "bg-green-100 text-green-800",
      iconColor: "text-green-600"
    },
    {
      title: "Cash Flow Statement",
      description: "Money in vs money out analysis",
      icon: DollarSign,
      href: "/dashboard/reports/cash-flow",
      color: "bg-blue-100 text-blue-800",
      iconColor: "text-blue-600"
    },
    {
      title: "Balance Sheet",
      description: "Assets, liabilities, and equity overview",
      icon: BarChart3,
      href: "/dashboard/reports/balance-sheet",
      color: "bg-purple-100 text-purple-800",
      iconColor: "text-purple-600"
    },
    {
      title: "Sales Analytics",
      description: "Customer insights and sales trends",
      icon: PieChart,
      href: "/dashboard/reports/sales-analytics",
      color: "bg-orange-100 text-orange-800",
      iconColor: "text-orange-600"
    },
    {
      title: "Invoice Aging",
      description: "Outstanding payments and collection status",
      icon: Calendar,
      href: "/dashboard/reports/invoice-aging",
      color: "bg-red-100 text-red-800",
      iconColor: "text-red-600"
    }
  ];

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
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6" />
              <h1 className="text-2xl font-medium">Reports</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 w-full max-w-full">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Summary Cards */}
            {reportSummary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(reportSummary.totalRevenue)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <DollarSign className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(reportSummary.totalExpenses)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${reportSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(reportSummary.netProfit)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Outstanding Invoices</CardTitle>
                    <Calendar className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {reportSummary.outstandingInvoices}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {reportSummary.overdueInvoices} overdue
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => {
                const Icon = report.icon;
                return (
                  <Card key={report.title} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <Link href={report.href}>
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${report.color}`}>
                            <Icon className={`h-5 w-5 ${report.iconColor}`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{report.title}</CardTitle>
                            <CardDescription className="text-sm">
                              {report.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Report
                          </Button>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                );
              })}
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Generate and export reports quickly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export P&L
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Cash Flow
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export All Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
