import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ReportFilter, VendorDashboardSummary } from "@/lib/types";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function firstRelatedRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export async function getVendorBusinesses() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from("business_memberships")
    .select("business_id, role, businesses(id, business_name, location_area, status)")
    .eq("user_id", user.id);

  return data ?? [];
}

export async function getVendorDashboardSummary(
  businessId: string,
  supabaseClient?: SupabaseClient
): Promise<VendorDashboardSummary> {
  const supabase = supabaseClient ?? (await createSupabaseServerClient());

  const [todayTransactions, monthlyTransactions, customers, itemRows] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, total_amount, amount_pending, payment_status, created_at, customers(full_name)")
      .eq("business_id", businessId)
      .gte("transaction_date", startOfToday())
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("total_amount, amount_pending")
      .eq("business_id", businessId)
      .gte("transaction_date", startOfMonth()),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase
      .from("transaction_items")
      .select("item_name, quantity, line_total, transactions!inner(business_id)")
      .eq("transactions.business_id", businessId)
  ]);

  const todayRows = todayTransactions.data ?? [];
  const monthlyRows = monthlyTransactions.data ?? [];
  const topProductMap = new Map<string, { totalSold: number; revenue: number }>();

  for (const item of itemRows.data ?? []) {
    const current = topProductMap.get(item.item_name) ?? { totalSold: 0, revenue: 0 };
    current.totalSold += Number(item.quantity ?? 0);
    current.revenue += Number(item.line_total ?? 0);
    topProductMap.set(item.item_name, current);
  }

  const topProducts = [...topProductMap.entries()]
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    todaySales: todayRows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0),
    monthlySales: monthlyRows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0),
    pendingPayments: monthlyRows.reduce((sum, row) => sum + Number(row.amount_pending ?? 0), 0),
    transactionsToday: todayRows.length,
    topProducts,
    recentTransactions: todayRows.slice(0, 5).map((row) => ({
      id: row.id,
      customerName: firstRelatedRow(row.customers)?.full_name ?? "Walk-in customer",
      totalAmount: Number(row.total_amount ?? 0),
      paymentStatus: row.payment_status,
      createdAt: row.created_at
    })),
    customersCount: customers.count ?? 0
  };
}

export async function getAdminOverview() {
  const supabase = await createSupabaseServerClient();
  const [businesses, enquiries, transactions] = await Promise.all([
    supabase.from("businesses").select("id, business_name, location_area, status, is_active, business_categories(name)"),
    supabase.from("enquiries").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("total_amount, amount_pending")
  ]);

  const transactionRows = transactions.data ?? [];

  return {
    businesses: businesses.data ?? [],
    enquiriesCount: enquiries.count ?? 0,
    totalSales: transactionRows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0),
    totalPending: transactionRows.reduce((sum, row) => sum + Number(row.amount_pending ?? 0), 0)
  };
}

export function getReportDateRange(
  filter: ReportFilter | string,
  startParam?: string | null,
  endParam?: string | null
) {
  const now = new Date();

  if (filter === "yesterday") {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (filter === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  if (filter === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  }

  if (filter === "custom") {
    const start = new Date(startParam ?? now.toISOString());
    const end = new Date(endParam ?? now.toISOString());
    return { start, end };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { start, end: now };
}

export async function getVendorReport(
  businessId: string,
  filter: ReportFilter | string,
  supabaseClient?: SupabaseClient,
  customStart?: string | null,
  customEnd?: string | null
) {
  const supabase = supabaseClient ?? (await createSupabaseServerClient());
  const { start, end } = getReportDateRange(filter, customStart, customEnd);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, customer_id, total_amount, amount_paid, amount_pending, transaction_date")
    .eq("business_id", businessId)
    .gte("transaction_date", start.toISOString())
    .lte("transaction_date", end.toISOString());

  const { data: items } = await supabase
    .from("transaction_items")
    .select("item_name, quantity, line_total, transactions!inner(business_id, transaction_date)")
    .eq("transactions.business_id", businessId)
    .gte("transactions.transaction_date", start.toISOString())
    .lte("transactions.transaction_date", end.toISOString());

  const transactionRows = transactions ?? [];
  const itemRows = items ?? [];
  const topProductsMap = new Map<string, { quantity: number; revenue: number }>();
  const salesByDay = new Map<string, number>();
  const customerCounts = new Map<string, number>();

  for (const row of transactionRows) {
    const day = row.transaction_date.slice(0, 10);
    salesByDay.set(day, (salesByDay.get(day) ?? 0) + Number(row.total_amount ?? 0));

    if (row.customer_id) {
      customerCounts.set(row.customer_id, (customerCounts.get(row.customer_id) ?? 0) + 1);
    }
  }

  for (const item of itemRows) {
    const current = topProductsMap.get(item.item_name) ?? { quantity: 0, revenue: 0 };
    current.quantity += Number(item.quantity ?? 0);
    current.revenue += Number(item.line_total ?? 0);
    topProductsMap.set(item.item_name, current);
  }

  const totalSales = transactionRows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);

  return {
    filter,
    start: start.toISOString(),
    end: end.toISOString(),
    totalSales,
    transactionsCount: transactionRows.length,
    paidAmount: transactionRows.reduce((sum, row) => sum + Number(row.amount_paid ?? 0), 0),
    pendingAmount: transactionRows.reduce((sum, row) => sum + Number(row.amount_pending ?? 0), 0),
    averageTransactionValue: transactionRows.length > 0 ? totalSales / transactionRows.length : 0,
    bestSalesDay: [...salesByDay.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    returningCustomers: [...customerCounts.values()].filter((count) => count > 1).length,
    topProducts: [...topProductsMap.entries()]
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  };
}
