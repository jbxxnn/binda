"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Download, 
  Building2,
  CreditCard,
  TrendingUp,
  Loader,
  Filter
} from "lucide-react";
import Link from "next/link";

interface BalanceSheetReport {
  assets: {
    currentAssets: number;
    fixedAssets: number;
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: number;
    longTermLiabilities: number;
    totalLiabilities: number;
  };
  equity: {
    ownerEquity: number;
    retainedEarnings: number;
    totalEquity: number;
  };
  period: {
    start: string;
    end: string;
  };
}

export default function BalanceSheetPage() {
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year' | 'all'>('3months');

  useEffect(() => {
    fetchBalanceSheetReport();
  }, [selectedPeriod]);

  const fetchBalanceSheetReport = async () => {
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

      // Fetch transaction data for the period
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type, category, transaction_date')
        .eq('business_id', businesses.id)
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0]);

      // Calculate balance sheet components
      const totalRevenue = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
      const netIncome = totalRevenue - totalExpenses;

      // Simplified balance sheet calculation
      // In a real system, this would be more complex with proper asset/liability tracking
      const currentAssets = totalRevenue * 0.3; // Assume 30% of revenue is in current assets
      const fixedAssets = totalRevenue * 0.2; // Assume 20% of revenue is in fixed assets
      const totalAssets = currentAssets + fixedAssets;

      const currentLiabilities = totalExpenses * 0.4; // Assume 40% of expenses are current liabilities
      const longTermLiabilities = totalExpenses * 0.1; // Assume 10% are long-term
      const totalLiabilities = currentLiabilities + longTermLiabilities;

      const ownerEquity = totalAssets - totalLiabilities;
      const retainedEarnings = Math.max(0, netIncome * 0.7); // Assume 70% of net income is retained
      const totalEquity = ownerEquity + retainedEarnings;

      setReport({
        assets: {
          currentAssets,
          fixedAssets,
          totalAssets
        },
        liabilities: {
          currentLiabilities,
          longTermLiabilities,
          totalLiabilities
        },
        equity: {
          ownerEquity,
          retainedEarnings,
          totalEquity
        },
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      });
    } catch (error) {
      console.error('Error fetching balance sheet report:', error);
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
                <Building2 className="h-6 w-6" />
                <h1 className="text-2xl font-medium">Balance Sheet</h1>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(report.assets.totalAssets)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
                      <CreditCard className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(report.liabilities.totalLiabilities)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(report.equity.totalEquity)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Balance Sheet Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Assets */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-600">ASSETS</CardTitle>
                      <CardDescription>What the business owns</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="font-medium">Current Assets</span>
                          <span className="font-bold">{formatCurrency(report.assets.currentAssets)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="font-medium">Fixed Assets</span>
                          <span className="font-bold">{formatCurrency(report.assets.fixedAssets)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t-2 border-green-600">
                          <span className="font-bold text-green-600">Total Assets</span>
                          <span className="font-bold text-green-600">{formatCurrency(report.assets.totalAssets)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Liabilities & Equity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600">LIABILITIES & EQUITY</CardTitle>
                      <CardDescription>What the business owes and owns</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-red-600">Liabilities</h4>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-sm">Current Liabilities</span>
                            <span className="text-sm font-medium">{formatCurrency(report.liabilities.currentLiabilities)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-sm">Long-term Liabilities</span>
                            <span className="text-sm font-medium">{formatCurrency(report.liabilities.longTermLiabilities)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-red-200">
                            <span className="font-medium text-red-600">Total Liabilities</span>
                            <span className="font-bold text-red-600">{formatCurrency(report.liabilities.totalLiabilities)}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium text-green-600">Equity</h4>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-sm">Owner&apos;s Equity</span>
                            <span className="text-sm font-medium">{formatCurrency(report.equity.ownerEquity)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-sm">Retained Earnings</span>
                            <span className="text-sm font-medium">{formatCurrency(report.equity.retainedEarnings)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-t-2 border-green-600">
                            <span className="font-bold text-green-600">Total Equity</span>
                            <span className="font-bold text-green-600">{formatCurrency(report.equity.totalEquity)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Balance Verification */}
                <Card>
                  <CardHeader>
                    <CardTitle>Balance Verification</CardTitle>
                    <CardDescription>Assets should equal Liabilities + Equity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">Assets = Liabilities + Equity</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(report.assets.totalAssets)} = {formatCurrency(report.liabilities.totalLiabilities)} + {formatCurrency(report.equity.totalEquity)}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        Math.abs(report.assets.totalAssets - (report.liabilities.totalLiabilities + report.equity.totalEquity)) < 0.01
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {Math.abs(report.assets.totalAssets - (report.liabilities.totalLiabilities + report.equity.totalEquity)) < 0.01
                          ? 'Balanced'
                          : 'Not Balanced'
                        }
                      </div>
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
