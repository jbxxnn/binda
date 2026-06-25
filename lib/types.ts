export type AppRole = "admin" | "vendor";
export type PaymentStatus = "paid" | "pending" | "partial";
export type PaymentMethod = "cash" | "transfer" | "pos";

export type VendorDashboardSummary = {
  todaySales: number;
  monthlySales: number;
  pendingPayments: number;
  transactionsToday: number;
  topProducts: Array<{ name: string; totalSold: number; revenue: number }>;
  recentTransactions: Array<{
    id: string;
    customerName: string;
    totalAmount: number;
    paymentStatus: PaymentStatus;
    createdAt: string;
  }>;
  customersCount: number;
};

export type ReportFilter = "today" | "yesterday" | "week" | "month" | "custom";
