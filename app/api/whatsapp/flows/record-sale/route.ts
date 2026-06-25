import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatNaira } from "@/lib/whatsapp";

const itemSchema = z.object({
  productId: z.string().uuid().optional(),
  itemName: z.string().min(2),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative()
});

const recordSaleSchema = z.object({
  businessId: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  recordedBy: z.string().uuid(),
  paymentStatus: z.enum(["paid", "pending", "partial"]),
  paymentMethod: z.enum(["cash", "transfer", "pos"]),
  amountPaid: z.number().nonnegative(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1)
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const input = recordSaleSchema.parse(body);
  const supabase = createSupabaseAdminClient();

  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal;
  const pending = Math.max(total - input.amountPaid, 0);

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      business_id: input.businessId,
      customer_id: input.customerId ?? null,
      recorded_by: input.recordedBy,
      subtotal_amount: subtotal,
      total_amount: total,
      amount_paid: input.amountPaid,
      amount_pending: pending,
      payment_status: input.paymentStatus,
      payment_method: input.paymentMethod,
      notes: input.notes
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    return NextResponse.json(
      { error: transactionError?.message ?? "Unable to record transaction" },
      { status: 400 }
    );
  }

  await supabase.from("transaction_items").insert(
    input.items.map((item) => ({
      transaction_id: transaction.id,
      product_id: item.productId ?? null,
      item_name: item.itemName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.quantity * item.unitPrice
    }))
  );

  if (input.amountPaid > 0) {
    await supabase.from("payments").insert({
      transaction_id: transaction.id,
      business_id: input.businessId,
      customer_id: input.customerId ?? null,
      amount: input.amountPaid,
      payment_method: input.paymentMethod,
      recorded_by: input.recordedBy
    });
  }

  const { data: todayTransactions } = await supabase
    .from("transactions")
    .select("total_amount")
    .eq("business_id", input.businessId)
    .gte("transaction_date", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  const todayTotal = (todayTransactions ?? []).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);

  return NextResponse.json({
    success: true,
    message: `Sale recorded successfully. Today's total sales is ${formatNaira(todayTotal)}.`,
    transactionId: transaction.id
  });
}
