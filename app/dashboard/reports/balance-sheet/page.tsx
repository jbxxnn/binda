"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePreferences } from "@/lib/contexts/preferences-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  // Download, 
  Building2,
  CreditCard,
  TrendingUp,
  Loader,
  Filter
} from "lucide-react";
import Link from "next/link";
import { ExportDropdown } from "@/components/export-dropdown";
import { ExportData } from "@/lib/export-utils";

interface AccountBalance extends Record<string, unknown> {
  account_type: string;
  account_name: string;
  account_code: string;
  balance_amount: number;
  parent_account_name?: string;
}

interface BalanceSheetReport {
  summary: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    isBalanced: boolean;
  };
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  equity: AccountBalance[];
  balanceDate: string;
}

export default function BalanceSheetPage() {
  const { formatCurrency } = usePreferences();
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchBalanceSheetReport();
  }, [selectedDate]);

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

      // Initialize account mappings if needed
      await supabase.rpc('create_default_account_mappings', {
        business_uuid: businesses.id
      });

      // Update account balances with proper double-entry accounting
      await supabase.rpc('update_account_balances_with_double_entry', {
        business_uuid: businesses.id,
        balance_date: selectedDate
      });

      // Get balance sheet summary
      const { data: summary } = await supabase
        .rpc('get_balance_sheet_summary', {
          business_uuid: businesses.id,
          balance_date: selectedDate
        })
        .single() as { data: { total_assets: number; total_liabilities: number; total_equity: number; is_balanced: boolean } | null };

      // Get detailed balance sheet data
      const { data: balanceData } = await supabase
        .rpc('get_balance_sheet_data', {
          business_uuid: businesses.id,
          balance_date: selectedDate
        });

      if (!summary || !balanceData) {
        // If no accounts exist, show empty state
        setReport({
          summary: {
            totalAssets: 0,
            totalLiabilities: 0,
            totalEquity: 0,
            isBalanced: true
          },
          assets: [],
          liabilities: [],
          equity: [],
          balanceDate: selectedDate
        });
        return;
      }

      // Group accounts by type
      const assets = balanceData.filter((account: AccountBalance) => account.account_type === 'asset' && account.balance_amount !== 0);
      const liabilities = balanceData.filter((account: AccountBalance) => account.account_type === 'liability' && account.balance_amount !== 0);
      const equity = balanceData.filter((account: AccountBalance) => account.account_type === 'equity' && account.balance_amount !== 0);

      setReport({
        summary: {
          totalAssets: summary.total_assets,
          totalLiabilities: summary.total_liabilities,
          totalEquity: summary.total_equity,
          isBalanced: summary.is_balanced
        },
        assets,
        liabilities,
        equity,
        balanceDate: selectedDate
      });
    } catch (error) {
      console.error('Error fetching balance sheet report:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const prepareExportData = (): ExportData => {
    if (!report) {
      return {
        title: 'Balance Sheet',
        period: 'No data available',
        summary: [],
        tables: [],
        charts: []
      };
    }

    return {
      title: 'Balance Sheet',
      period: `As of ${new Date(report.balanceDate).toLocaleDateString()}`,
      summary: [
        { label: 'Total Assets', value: report.summary.totalAssets },
        { label: 'Total Liabilities', value: report.summary.totalLiabilities },
        { label: 'Total Equity', value: report.summary.totalEquity },
        { label: 'Balanced', value: report.summary.isBalanced ? 'Yes' : 'No' }
      ],
      tables: [
        {
          title: 'Assets',
          columns: [
            { key: 'account_code', label: 'Code' },
            { key: 'account_name', label: 'Account Name' },
            { key: 'balance_amount', label: 'Balance' }
          ],
          data: report.assets
        },
        {
          title: 'Liabilities',
          columns: [
            { key: 'account_code', label: 'Code' },
            { key: 'account_name', label: 'Account Name' },
            { key: 'balance_amount', label: 'Balance' }
          ],
          data: report.liabilities
        },
        {
          title: 'Equity',
          columns: [
            { key: 'account_code', label: 'Code' },
            { key: 'account_name', label: 'Account Name' },
            { key: 'balance_amount', label: 'Balance' }
          ],
          data: report.equity
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
                <Building2 className="h-6 w-6" />
                <h1 className="text-2xl font-medium">Balance Sheet</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1 border border-brand-tropical rounded-md text-sm"
                  aria-label="Select Balance Sheet Date"
                />
              </div>
              <ExportDropdown 
                data={prepareExportData()} 
                filename={`balance-sheet-${selectedDate}`}
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
                {/* Empty State for New Businesses */}
                {report.assets.length === 0 && report.liabilities.length === 0 && report.equity.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Chart of Accounts Found</h3>
                      <p className="text-muted-foreground mb-4">
                        Your business needs a Chart of Accounts to generate a Balance Sheet. 
                        This should have been set up automatically when you created your business.
                      </p>
                      <Button 
                        onClick={() => window.location.href = '/dashboard/accounts'}
                        className="bg-brand-hunter hover:bg-brand-underworld text-white"
                      >
                        Go to Chart of Accounts
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(report.summary.totalAssets)}
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
                        {formatCurrency(report.summary.totalLiabilities)}
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
                        {formatCurrency(report.summary.totalEquity)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Balance Status</CardTitle>
                      <div className={`w-4 h-4 rounded-full ${report.summary.isBalanced ? 'bg-green-500' : 'bg-red-500'}`} />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${report.summary.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                        {report.summary.isBalanced ? 'Balanced' : 'Not Balanced'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Balance Sheet Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Assets */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-600">ASSETS</CardTitle>
                      <CardDescription>What the business owns</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {report.assets.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            No asset accounts with balances
                          </div>
                        ) : (
                          report.assets.map((account, index) => (
                            <div key={index} className="flex justify-between items-center py-1">
                              <div>
                                <div className="text-sm font-medium">{account.account_name}</div>
                                <div className="text-xs text-muted-foreground">{account.account_code}</div>
                              </div>
                              <span className="text-sm font-medium">{formatCurrency(account.balance_amount)}</span>
                            </div>
                          ))
                        )}
                        <div className="flex justify-between items-center py-2 border-t-2 border-green-600 mt-4">
                          <span className="font-bold text-green-600">Total Assets</span>
                          <span className="font-bold text-green-600">{formatCurrency(report.summary.totalAssets)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Liabilities */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600">LIABILITIES</CardTitle>
                      <CardDescription>What the business owes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {report.liabilities.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            No liability accounts with balances
                          </div>
                        ) : (
                          report.liabilities.map((account, index) => (
                            <div key={index} className="flex justify-between items-center py-1">
                              <div>
                                <div className="text-sm font-medium">{account.account_name}</div>
                                <div className="text-xs text-muted-foreground">{account.account_code}</div>
                              </div>
                              <span className="text-sm font-medium">{formatCurrency(account.balance_amount)}</span>
                            </div>
                          ))
                        )}
                        <div className="flex justify-between items-center py-2 border-t-2 border-red-600 mt-4">
                          <span className="font-bold text-red-600">Total Liabilities</span>
                          <span className="font-bold text-red-600">{formatCurrency(report.summary.totalLiabilities)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Equity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-blue-600">EQUITY</CardTitle>
                      <CardDescription>Owner&apos;s stake in the business</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {report.equity.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            No equity accounts with balances
                          </div>
                        ) : (
                          report.equity.map((account, index) => (
                            <div key={index} className="flex justify-between items-center py-1">
                              <div>
                                <div className="text-sm font-medium">{account.account_name}</div>
                                <div className="text-xs text-muted-foreground">{account.account_code}</div>
                              </div>
                              <span className="text-sm font-medium">{formatCurrency(account.balance_amount)}</span>
                            </div>
                          ))
                        )}
                        <div className="flex justify-between items-center py-2 border-t-2 border-blue-600 mt-4">
                          <span className="font-bold text-blue-600">Total Equity</span>
                          <span className="font-bold text-blue-600">{formatCurrency(report.summary.totalEquity)}</span>
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
                          {formatCurrency(report.summary.totalAssets)} = {formatCurrency(report.summary.totalLiabilities)} + {formatCurrency(report.summary.totalEquity)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          As of {new Date(report.balanceDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        report.summary.isBalanced
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {report.summary.isBalanced ? 'Balanced' : 'Not Balanced'}
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
