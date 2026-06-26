import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isValidNigerianPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatNaira } from "@/lib/whatsapp";

const itemSchema = z.object({
  productId: z.string().uuid().optional(),
  itemName: z.string().min(2),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  stockQuantity: z.number().nonnegative().nullable().optional()
});

const recordSaleSchema = z
  .object({
    businessId: z.string().uuid(),
    customerId: z.string().uuid().nullable().optional(),
    customerMode: z.string().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    recordedBy: z.string().uuid(),
    saleMode: z.enum(["existing_product", "new_item"]).optional(),
    saveAsProduct: z.enum(["yes", "no"]).optional(),
    paymentStatus: z.enum(["paid", "pending", "partial"]),
    paymentMethod: z.enum(["cash", "transfer", "pos"]),
    amountPaid: z.number().nonnegative(),
    notes: z.string().optional(),
    items: z.array(itemSchema).min(1)
  });

type ProductRow = {
  id: string;
  business_id: string;
  name: string;
  unit_price: number | string;
  stock_quantity?: number | string | null;
};

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const input = recordSaleSchema.parse(body);
  const supabase = createSupabaseAdminClient();

  const { data: membership } = await supabase
    .from("business_memberships")
    .select("id")
    .eq("business_id", input.businessId)
    .eq("user_id", input.recordedBy)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "Vendor does not have access to this business." },
      { status: 403 }
    );
  }

  let resolvedCustomerId = input.customerId ?? null;
  const normalizedCustomerName = normalizeOptionalText(input.customerName);
  const normalizedCustomerPhone = normalizeOptionalText(input.customerPhone);
  const isNewCustomer =
    input.customerMode === "NEW_CUSTOMER" || (!resolvedCustomerId && Boolean(normalizedCustomerName));

  if (resolvedCustomerId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("id", resolvedCustomerId)
      .eq("business_id", input.businessId)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json(
        { error: "Selected customer does not belong to this business." },
        { status: 400 }
      );
    }
  } else if (isNewCustomer) {
    if (!normalizedCustomerName || normalizedCustomerName.length < 2) {
      return NextResponse.json(
        { error: "New customer name must contain at least 2 characters." },
        { status: 400 }
      );
    }

    if (normalizedCustomerPhone && !isValidNigerianPhoneNumber(normalizedCustomerPhone)) {
      return NextResponse.json(
        { error: "Please provide a valid Nigerian customer phone number." },
        { status: 400 }
      );
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        business_id: input.businessId,
        full_name: normalizedCustomerName,
        phone_number: normalizedCustomerPhone ? normalizePhoneNumber(normalizedCustomerPhone) : null
      })
      .select("id")
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: customerError?.message ?? "Unable to create customer." },
        { status: 400 }
      );
    }

    resolvedCustomerId = customer.id;
  }

  const resolvedItems = [];

  for (const item of input.items) {
    let resolvedProductId = item.productId ?? null;
    let resolvedItemName = item.itemName;
    let resolvedUnitPrice = item.unitPrice;

    if (resolvedProductId) {
      const { data: product } = await supabase
        .from("products")
        .select("id, business_id, name, unit_price, stock_quantity")
        .eq("id", resolvedProductId)
        .eq("business_id", input.businessId)
        .maybeSingle<ProductRow>();

      if (!product) {
        return NextResponse.json(
          { error: "Selected product does not belong to this business." },
          { status: 400 }
        );
      }

      resolvedItemName = product.name;
      resolvedUnitPrice = item.unitPrice ?? Number(product.unit_price ?? 0);
    } else if (input.saveAsProduct === "yes") {
      const { data: createdProduct, error: productError } = await supabase
        .from("products")
        .insert({
          business_id: input.businessId,
          name: item.itemName,
          unit_price: item.unitPrice,
          stock_quantity: item.stockQuantity ?? null,
          is_active: true
        })
        .select("id")
        .single();

      if (productError || !createdProduct) {
        return NextResponse.json(
          { error: productError?.message ?? "Unable to save product for future use." },
          { status: 400 }
        );
      }

      resolvedProductId = createdProduct.id;
    }

    resolvedItems.push({
      productId: resolvedProductId,
      itemName: resolvedItemName,
      quantity: item.quantity,
      unitPrice: resolvedUnitPrice
    });
  }

  const subtotal = resolvedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal;
  const normalizedAmountPaid = Math.min(Math.max(input.amountPaid, 0), total);
  const normalizedPaymentStatus =
    normalizedAmountPaid === 0
      ? "pending"
      : normalizedAmountPaid >= total
        ? "paid"
        : "partial";
  const pending = Math.max(total - normalizedAmountPaid, 0);

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      business_id: input.businessId,
      customer_id: resolvedCustomerId,
      recorded_by: input.recordedBy,
      subtotal_amount: subtotal,
      total_amount: total,
      amount_paid: normalizedAmountPaid,
      amount_pending: pending,
      payment_status: normalizedPaymentStatus,
      payment_method: input.paymentMethod,
      notes: normalizeOptionalText(input.notes) ?? null
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    return NextResponse.json(
      { error: transactionError?.message ?? "Unable to record transaction" },
      { status: 400 }
    );
  }

  const { error: itemsError } = await supabase.from("transaction_items").insert(
    resolvedItems.map((item) => ({
      transaction_id: transaction.id,
      product_id: item.productId,
      item_name: item.itemName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.quantity * item.unitPrice
    }))
  );

  if (itemsError) {
    return NextResponse.json(
      { error: itemsError.message ?? "Unable to save transaction items." },
      { status: 400 }
    );
  }

  for (const item of resolvedItems) {
    if (!item.productId) {
      continue;
    }

    const matchingInput = input.items.find((entry) => entry.productId === item.productId);
    const soldQuantity = matchingInput?.quantity ?? item.quantity;
    const { data: product } = await supabase
      .from("products")
      .select("id, stock_quantity")
      .eq("id", item.productId)
      .eq("business_id", input.businessId)
      .maybeSingle();

    if (!product || product.stock_quantity == null) {
      continue;
    }

    const nextStock = Math.max(Number(product.stock_quantity) - Number(soldQuantity), 0);

    await supabase.from("products").update({ stock_quantity: nextStock }).eq("id", item.productId);
  }

  if (normalizedAmountPaid > 0) {
    const { error: paymentError } = await supabase.from("payments").insert({
      transaction_id: transaction.id,
      business_id: input.businessId,
      customer_id: resolvedCustomerId,
      amount: normalizedAmountPaid,
      payment_method: input.paymentMethod,
      recorded_by: input.recordedBy
    });

    if (paymentError) {
      return NextResponse.json(
        { error: paymentError.message ?? "Unable to save payment record." },
        { status: 400 }
      );
    }
  }

  const { data: todayTransactions } = await supabase
    .from("transactions")
    .select("total_amount")
    .eq("business_id", input.businessId)
    .gte("transaction_date", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  const todayTotal = (todayTransactions ?? []).reduce(
    (sum, row) => sum + Number(row.total_amount ?? 0),
    0
  );
  const paymentSummary =
    normalizedPaymentStatus === "paid"
      ? "Paid in full."
      : normalizedPaymentStatus === "partial"
        ? `Partial payment recorded. Balance: ${formatNaira(pending)}.`
        : `Pending payment recorded. Balance: ${formatNaira(total)}.`;

  return NextResponse.json({
    success: true,
    message: `Sale recorded successfully. ${paymentSummary} Today's total sales is ${formatNaira(todayTotal)}.`,
    transactionId: transaction.id
  });
}
