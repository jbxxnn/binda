"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Download, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader,
  Filter
} from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface CashFlowData {
  period: string;
  cash_in: number;
  cash_out: number;
  net_cash_flow: number;
  running_balance: number;
}

interface CashFlowReport {
  summary: {
    totalCashIn: number;
    totalCashOut: number;
    netCashFlow: number;
    endingBalance: number;
  };
  monthlyData: CashFlowData[];
  period: {
    start: string;
    end: string;
  };
}

export default function CashFlowPage() {
  const [report, setReport] = useState<CashFlowReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year' | 'all'>('3months');

  useEffect(() => {
    fetchCashFlowReport();
  }, [selectedPeriod]);

  const fetchCashFlowReport = async () => {
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

      // Fetch transaction data
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type, transaction_date')
        .eq('business_id', businesses.id)
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0])
        .order('transaction_date', { ascending: true });

      // Process monthly data
      const monthlyData = processMonthlyCashFlow(transactions || []);

      // Calculate summary
      const totalCashIn = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalCashOut = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
      const netCashFlow = totalCashIn - totalCashOut;
      const endingBalance = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].running_balance : 0;

      setReport({
        summary: {
          totalCashIn,
          totalCashOut,
          netCashFlow,
          endingBalance
        },
        monthlyData,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      });
    } catch (error) {
      console.error('Error fetching cash flow report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processMonthlyCashFlow = (transactions: { type: string; amount: number; transaction_date: string }[]) => {
    const monthlyMap = new Map<string, { cash_in: number; cash_out: number }>();
    
    transactions.forEach(transaction => {
      const month = new Date(transaction.transaction_date).toISOString().slice(0, 7);
      const current = monthlyMap.get(month) || { cash_in: 0, cash_out: 0 };
      
      if (transaction.type === 'income') {
        monthlyMap.set(month, { ...current, cash_in: current.cash_in + transaction.amount });
      } else {
        monthlyMap.set(month, { ...current, cash_out: current.cash_out + transaction.amount });
      }
    });
    
    // Convert to array and calculate running balance
    const sortedData = Array.from(monthlyMap.entries())
      .map(([period, data]) => ({
        period: new Date(period + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        cash_in: data.cash_in,
        cash_out: data.cash_out,
        net_cash_flow: data.cash_in - data.cash_out,
        running_balance: 0 // Will be calculated below
      }))
      .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());

    // Calculate running balance
    let runningBalance = 0;
    return sortedData.map(item => {
      runningBalance += item.net_cash_flow;
      return { ...item, running_balance: runningBalance };
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
                <DollarSign className="h-6 w-6" />
                <h1 className="text-2xl font-medium">Cash Flow Statement</h1>
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
                      <CardTitle className="text-sm font-medium">Cash In</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(report.summary.totalCashIn)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Cash Out</CardTitle>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(report.summary.totalCashOut)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
                      <DollarSign className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${report.summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(report.summary.netCashFlow)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Ending Balance</CardTitle>
                      <DollarSign className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${report.summary.endingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(report.summary.endingBalance)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Cash Flow Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Cash In vs Cash Out</CardTitle>
                      <CardDescription>Monthly cash flow comparison</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={report.monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Bar dataKey="cash_in" fill="#10b981" name="Cash In" />
                          <Bar dataKey="cash_out" fill="#ef4444" name="Cash Out" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Running Balance Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Running Balance</CardTitle>
                      <CardDescription>Accumulated cash position over time</CardDescription>
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
                            dataKey="running_balance" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            name="Running Balance"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly Summary Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Cash Flow Summary</CardTitle>
                    <CardDescription>Detailed monthly cash flow breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {report.monthlyData.map((month, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{month.period}</div>
                            <div className="text-sm text-muted-foreground">
                              In: {formatCurrency(month.cash_in)} | Out: {formatCurrency(month.cash_out)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${month.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(month.net_cash_flow)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Balance: {formatCurrency(month.running_balance)}
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
