import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET || !authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: businesses } = await supabase.from("businesses").select("id");

  for (const business of businesses ?? []) {
    const { data: transactions } = await supabase
      .from("transactions")
      .select("customer_id, total_amount, amount_paid, amount_pending, transaction_date")
      .eq("business_id", business.id)
      .gte("transaction_date", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    const rows = transactions ?? [];
    const totalSales = rows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
    const paidAmount = rows.reduce((sum, row) => sum + Number(row.amount_paid ?? 0), 0);
    const pendingAmount = rows.reduce((sum, row) => sum + Number(row.amount_pending ?? 0), 0);

    await supabase.from("business_summary_cache").upsert({
      business_id: business.id,
      period_type: "today",
      period_start: new Date().toISOString().slice(0, 10),
      period_end: new Date().toISOString().slice(0, 10),
      total_sales: totalSales,
      transactions_count: rows.length,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
      average_transaction_value: rows.length > 0 ? totalSales / rows.length : 0,
      returning_customers: new Set(rows.map((row) => row.customer_id).filter(Boolean)).size,
      top_products: []
    });
  }

  return NextResponse.json({ success: true });
}
