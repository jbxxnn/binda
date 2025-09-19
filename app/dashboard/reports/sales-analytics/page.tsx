"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Download, 
  PieChart,
  TrendingUp,
//   Users,
  DollarSign,
  Loader,
  Filter
} from "lucide-react";
import Link from "next/link";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface SalesAnalyticsReport {
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionValue: number;
    topCustomer: string;
    topCustomerRevenue: number;
    revenueGrowth: number;
  };
  customerData: Array<{
    customer_name: string;
    revenue: number;
    transaction_count: number;
  }>;
  categoryData: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  monthlyData: Array<{
    month: string;
    revenue: number;
    transactions: number;
  }>;
  period: {
    start: string;
    end: string;
  };
}

export default function SalesAnalyticsPage() {
  const [report, setReport] = useState<SalesAnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year' | 'all'>('3months');

  useEffect(() => {
    fetchSalesAnalyticsReport();
  }, [selectedPeriod]);

  const fetchSalesAnalyticsReport = async () => {
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

      // Fetch revenue transactions
      const { data: revenueTransactions } = await supabase
        .from('transactions')
        .select(`
          amount,
          category,
          transaction_date,
          customer_id,
          customer:customers(name)
        `)
        .eq('business_id', businesses.id)
        .eq('type', 'income')
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0])
        .order('transaction_date', { ascending: true });

      // Fetch previous period for growth calculation
      const previousStartDate = new Date(startDate);
      previousStartDate.setTime(previousStartDate.getTime() - (endDate.getTime() - startDate.getTime()));

      const { data: previousTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('business_id', businesses.id)
        .eq('type', 'income')
        .gte('transaction_date', previousStartDate.toISOString().split('T')[0])
        .lt('transaction_date', startDate.toISOString().split('T')[0]);

      // Process data
      const totalRevenue = revenueTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalTransactions = revenueTransactions?.length || 0;
      const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      const previousRevenue = previousTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Process customer data
      const customerMap = new Map<string, { revenue: number; count: number }>();
      revenueTransactions?.forEach(transaction => {
        const customerName = transaction.customer?.[0]?.name || 'No Customer';
        const current = customerMap.get(customerName) || { revenue: 0, count: 0 };
        customerMap.set(customerName, {
          revenue: current.revenue + transaction.amount,
          count: current.count + 1
        });
      });

      const customerData = Array.from(customerMap.entries())
        .map(([name, data]) => ({ customer_name: name, revenue: data.revenue, transaction_count: data.count }))
        .sort((a, b) => b.revenue - a.revenue);

      const topCustomer = customerData[0]?.customer_name || 'No customers';
      const topCustomerRevenue = customerData[0]?.revenue || 0;

      // Process category data
      const categoryMap = new Map<string, number>();
      revenueTransactions?.forEach(transaction => {
        const category = transaction.category || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + transaction.amount);
      });

      const categoryData = Array.from(categoryMap.entries())
        .map(([category, revenue]) => ({
          category,
          revenue,
          percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Process monthly data
      const monthlyMap = new Map<string, { revenue: number; transactions: number }>();
      revenueTransactions?.forEach(transaction => {
        const month = new Date(transaction.transaction_date).toISOString().slice(0, 7);
        const current = monthlyMap.get(month) || { revenue: 0, transactions: 0 };
        monthlyMap.set(month, {
          revenue: current.revenue + transaction.amount,
          transactions: current.transactions + 1
        });
      });

      const monthlyData = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: data.revenue,
          transactions: data.transactions
        }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      setReport({
        summary: {
          totalRevenue,
          totalTransactions,
          averageTransactionValue,
          topCustomer,
          topCustomerRevenue,
          revenueGrowth
        },
        customerData: customerData.slice(0, 10), // Top 10 customers
        categoryData: categoryData.slice(0, 8), // Top 8 categories
        monthlyData,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      });
    } catch (error) {
      console.error('Error fetching sales analytics report:', error);
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

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

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
                <PieChart className="h-6 w-6" />
                <h1 className="text-2xl font-medium">Sales Analytics</h1>
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
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
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
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(report.summary.totalRevenue)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {report.summary.totalTransactions}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
                      <DollarSign className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(report.summary.averageTransactionValue)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Revenue Growth</CardTitle>
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${report.summary.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(report.summary.revenueGrowth)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue by Category */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue by Category</CardTitle>
                      <CardDescription>Sales breakdown by service/product category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={report.categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="revenue"
                          >
                            {report.categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-2">
                        {report.categoryData.map((item, index) => (
                          <div key={item.category} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="text-sm">{item.category}</span>
                            </div>
                            <span className="text-sm font-medium">{formatCurrency(item.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Monthly Revenue Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Revenue Trend</CardTitle>
                      <CardDescription>Revenue growth over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={report.monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Bar dataKey="revenue" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Customers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Customers</CardTitle>
                    <CardDescription>Your highest value customers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {report.customerData.map((customer, index) => (
                        <div key={customer.customer_name} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                            </div>
                            <div>
                              <div className="font-medium">{customer.customer_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {customer.transaction_count} transaction{customer.transaction_count !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              {formatCurrency(customer.revenue)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatPercentage((customer.revenue / report.summary.totalRevenue) * 100)} of total
                            </div>
                          </div>
                        </div>
                      ))}
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
