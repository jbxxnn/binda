"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePreferences } from "@/lib/contexts/preferences-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  //   Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader,
  Filter
} from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { ExportDropdown } from "@/components/export-dropdown";
import { ExportData } from "@/lib/export-utils";

interface PnLData extends Record<string, unknown> {
  period: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

interface CategoryBreakdown extends Record<string, unknown> {
  category: string;
  amount: number;
  type: 'income' | 'expense';
}

interface ProfitLossReport {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
  };
  monthlyData: PnLData[];
  revenueBreakdown: CategoryBreakdown[];
  expenseBreakdown: CategoryBreakdown[];
  period: {
    start: string;
    end: string;
  };
}

export default function ProfitLossPage() {
  const { formatCurrency } = usePreferences();
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year' | 'all'>('3months');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const fetchProfitLossReport = useCallback(async () => {
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
          startDate.setFullYear(2020); // Far back enough
          break;
      }

      // Fetch revenue data
      const { data: revenueData } = await supabase
        .from('transactions')
        .select('amount, category, transaction_date')
        .eq('business_id', businesses.id)
        .eq('type', 'income')
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0])
        .order('transaction_date', { ascending: true });

      // Fetch expense data
      const { data: expenseData } = await supabase
        .from('transactions')
        .select('amount, category, transaction_date')
        .eq('business_id', businesses.id)
        .eq('type', 'expense')
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0])
        .order('transaction_date', { ascending: true });

      // Process monthly data
      const monthlyData = processMonthlyData(revenueData || [], expenseData || []);
      
      // Process category breakdowns
      const revenueBreakdown = processCategoryBreakdown(revenueData || [], 'income');
      const expenseBreakdown = processCategoryBreakdown(expenseData || [], 'expense');

      // Calculate summary
      const totalRevenue = revenueData?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpenses = expenseData?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const netProfit = totalRevenue - totalExpenses;
      const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
      const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      setReport({
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit,
          grossMargin,
          netMargin
        },
        monthlyData,
        revenueBreakdown,
        expenseBreakdown,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      });
    } catch (error) {
      console.error('Error fetching profit loss report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchProfitLossReport();
  }, [fetchProfitLossReport]);

  const processMonthlyData = (revenue: { amount: number; category: string; transaction_date: string }[], expenses: { amount: number; category: string; transaction_date: string }[]) => {
    const monthlyMap = new Map<string, { revenue: number; expenses: number }>();
    
    // Process revenue
    revenue.forEach(transaction => {
      const month = new Date(transaction.transaction_date).toISOString().slice(0, 7);
      const current = monthlyMap.get(month) || { revenue: 0, expenses: 0 };
      monthlyMap.set(month, { ...current, revenue: current.revenue + transaction.amount });
    });
    
    // Process expenses
    expenses.forEach(transaction => {
      const month = new Date(transaction.transaction_date).toISOString().slice(0, 7);
      const current = monthlyMap.get(month) || { revenue: 0, expenses: 0 };
      monthlyMap.set(month, { ...current, expenses: current.expenses + transaction.amount });
    });
    
    // Convert to array and sort
    return Array.from(monthlyMap.entries())
      .map(([period, data]) => ({
        period: new Date(period + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: data.revenue,
        expenses: data.expenses,
        netProfit: data.revenue - data.expenses
      }))
      .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());
  };

  const processCategoryBreakdown = (transactions: { category: string; amount: number }[], type: 'income' | 'expense') => {
    const categoryMap = new Map<string, number>();
    
    transactions.forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + transaction.amount);
    });
    
    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount, type }))
      .sort((a, b) => b.amount - a.amount);
  };


  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const prepareExportData = (): ExportData => {
    if (!report) {
      return {
        title: 'Profit & Loss Statement',
        period: 'No data available',
        summary: [],
        tables: [],
        charts: []
      };
    }

    return {
      title: 'Profit & Loss Statement',
      period: `${report.period.start} to ${report.period.end}`,
      summary: [
        { label: 'Total Revenue', value: report.summary.totalRevenue },
        { label: 'Total Expenses', value: report.summary.totalExpenses },
        { label: 'Net Profit', value: report.summary.netProfit },
        { label: 'Gross Margin', value: report.summary.grossMargin / 100 },
        { label: 'Net Margin', value: report.summary.netMargin / 100 }
      ],
      tables: [
        {
          title: 'Monthly Summary',
          columns: [
            { key: 'period', label: 'Period' },
            { key: 'revenue', label: 'Revenue' },
            { key: 'expenses', label: 'Expenses' },
            { key: 'netProfit', label: 'Net Profit' }
          ],
          data: report.monthlyData
        },
        {
          title: 'Revenue Breakdown',
          columns: [
            { key: 'category', label: 'Category' },
            { key: 'amount', label: 'Amount' }
          ],
          data: report.revenueBreakdown
        },
        {
          title: 'Expense Breakdown',
          columns: [
            { key: 'category', label: 'Category' },
            { key: 'amount', label: 'Amount' }
          ],
          data: report.expenseBreakdown
        }
      ],
      charts: [
        {
          title: 'Monthly Revenue vs Expenses',
          columns: ['period', 'revenue', 'expenses', 'netProfit'],
          data: report.monthlyData
        }
      ]
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
                <TrendingUp className="h-6 w-6" />
                <h1 className="text-2xl font-medium">Profit & Loss Statement</h1>
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
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'chart' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('chart')}
                >
                  Chart
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  Table
                </Button>
              </div>
              <ExportDropdown 
                data={prepareExportData()} 
                filename={`profit-loss-${selectedPeriod}`}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(report.summary.totalRevenue)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(report.summary.totalExpenses)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                      <DollarSign className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${report.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(report.summary.netProfit)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
                      <BarChart className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {formatPercentage(report.summary.grossMargin)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Net Margin</CardTitle>
                      <BarChart className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {formatPercentage(report.summary.netMargin)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Chart or Table View */}
                {viewMode === 'chart' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue vs Expenses Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Revenue vs Expenses</CardTitle>
                        <CardDescription>Monthly comparison over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={report.monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                            <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Net Profit Trend */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Net Profit Trend</CardTitle>
                        <CardDescription>Monthly profit/loss over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={report.monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Line 
                              type="monotone" 
                              dataKey="netProfit" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              name="Net Profit"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  /* Table View */
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Monthly Summary</CardTitle>
                        <CardDescription>Revenue, expenses, and profit by month</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {report.monthlyData.map((month, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">{month.period}</div>
                                <div className="text-sm text-muted-foreground">
                                  Revenue: {formatCurrency(month.revenue)} | 
                                  Expenses: {formatCurrency(month.expenses)}
                                </div>
                              </div>
                              <div className={`text-right font-bold ${month.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(month.netProfit)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Category Breakdown</CardTitle>
                        <CardDescription>Top revenue and expense categories</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-green-600 mb-2">Revenue Categories</h4>
                            {report.revenueBreakdown.slice(0, 5).map((item, index) => (
                              <div key={index} className="flex items-center justify-between py-1">
                                <span className="text-sm">{item.category}</span>
                                <span className="text-sm font-medium text-green-600">
                                  {formatCurrency(item.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <h4 className="font-medium text-red-600 mb-2">Expense Categories</h4>
                            {report.expenseBreakdown.slice(0, 5).map((item, index) => (
                              <div key={index} className="flex items-center justify-between py-1">
                                <span className="text-sm">{item.category}</span>
                                <span className="text-sm font-medium text-red-600">
                                  {formatCurrency(item.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
