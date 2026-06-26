import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatNaira } from "@/lib/whatsapp";

const createProductSchema = z.object({
  businessId: z.string().uuid(),
  recordedBy: z.string().uuid(),
  mode: z.literal("create"),
  productName: z.string().min(2),
  unitPrice: z.number().nonnegative(),
  stockQuantity: z.number().nonnegative().nullable().optional()
});

const updateProductSchema = z.object({
  businessId: z.string().uuid(),
  recordedBy: z.string().uuid(),
  mode: z.literal("update"),
  productId: z.string().uuid(),
  productName: z.string().optional(),
  unitPrice: z.number().nonnegative().nullable().optional(),
  stockQuantity: z.number().nonnegative().nullable().optional(),
  availabilityAction: z.enum(["keep", "active", "inactive"]).optional()
});

const productsFlowSchema = z.union([createProductSchema, updateProductSchema]);

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return undefined;
  }

  return value;
}

function formatStock(value: number | string | null) {
  if (value == null) {
    return "Not tracked";
  }

  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const input = productsFlowSchema.parse(body);
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

  if (input.mode === "create") {
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        business_id: input.businessId,
        name: input.productName.trim(),
        unit_price: input.unitPrice,
        stock_quantity: normalizeOptionalNumber(input.stockQuantity) ?? null,
        is_active: true
      })
      .select("id, name, unit_price, stock_quantity")
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: error?.message ?? "Unable to create product." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Product saved: ${product.name} at ${formatNaira(Number(product.unit_price ?? 0))}. Stock: ${formatStock(product.stock_quantity)}.`
    });
  }

  const { data: existingProduct, error: fetchError } = await supabase
    .from("products")
    .select("id, name, unit_price, stock_quantity, is_active")
    .eq("id", input.productId)
    .eq("business_id", input.businessId)
    .maybeSingle();

  if (fetchError || !existingProduct) {
    return NextResponse.json(
      { error: fetchError?.message ?? "Selected product does not belong to this business." },
      { status: 400 }
    );
  }

  const nextName = normalizeOptionalText(input.productName) ?? existingProduct.name;
  const nextUnitPrice = normalizeOptionalNumber(input.unitPrice) ?? Number(existingProduct.unit_price ?? 0);
  const nextStockQuantity =
    input.stockQuantity !== undefined
      ? normalizeOptionalNumber(input.stockQuantity) ?? null
      : existingProduct.stock_quantity;
  const nextIsActive =
    input.availabilityAction === "active"
      ? true
      : input.availabilityAction === "inactive"
        ? false
        : Boolean(existingProduct.is_active);

  const noChanges =
    nextName === existingProduct.name &&
    nextUnitPrice === Number(existingProduct.unit_price ?? 0) &&
    (nextStockQuantity ?? null) === (existingProduct.stock_quantity ?? null) &&
    nextIsActive === Boolean(existingProduct.is_active);

  if (noChanges) {
    return NextResponse.json({
      success: true,
      message: `No changes made. ${existingProduct.name} is still ${formatNaira(Number(existingProduct.unit_price ?? 0))}, stock ${formatStock(existingProduct.stock_quantity)}.`
    });
  }

  const { data: updatedProduct, error: updateError } = await supabase
    .from("products")
    .update({
      name: nextName,
      unit_price: nextUnitPrice,
      stock_quantity: nextStockQuantity,
      is_active: nextIsActive
    })
    .eq("id", input.productId)
    .select("id, name, unit_price, stock_quantity, is_active")
    .single();

  if (updateError || !updatedProduct) {
    return NextResponse.json(
      { error: updateError?.message ?? "Unable to update product." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Product updated: ${updatedProduct.name} at ${formatNaira(Number(updatedProduct.unit_price ?? 0))}. Stock: ${formatStock(updatedProduct.stock_quantity)}. ${updatedProduct.is_active ? "Active" : "Inactive"}.`
  });
}
