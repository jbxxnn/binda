import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  decryptWhatsAppFlowRequest,
  encryptWhatsAppFlowResponseBody,
  isEncryptedFlowRequest
} from "@/lib/whatsapp-flow-crypto";

const flowEndpointSchema = z.object({
  flow_token: z.string().min(1).optional(),
  screen: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  action: z.string().optional(),
  version: z.string().optional()
});

type ProductOption = {
  id: string;
  title: string;
  description?: string;
};

type CustomerOption = {
  id: string;
  title: string;
  description?: string;
};

type ProductRow = {
  id: string;
  name: string;
  unit_price: number | string;
  stock_quantity: number | string | null;
};

type RecentProductUsageRow = {
  product_id: string | null;
  line_total: number | string | null;
  transactions:
    | Array<{
        transaction_date: string;
      }>
    | null;
};

type RecentCustomerUsageRow = {
  id: string;
  full_name: string;
  phone_number: string | null;
  transactions: Array<{
    transaction_date: string;
    total_amount: number | string | null;
  }> | null;
};

type FlowState = {
  productId?: string;
  itemName?: string;
  unitPrice?: string;
  saveAsProduct?: string;
  customerMode?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  quantity?: string;
  amountPaid?: string;
  paymentStatus?: string;
  paymentMethod?: string;
};

function parseRecordSaleFlowToken(flowToken: string) {
  const [prefix, businessId, recordedBy] = flowToken.split(":");

  if (prefix !== "record_sale" || !businessId || !recordedBy) {
    return null;
  }

  return { businessId, recordedBy };
}

function formatPriceLabel(value: number | string | null) {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat("en-NG", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numericValue);
}

function formatStockLabel(value: number | string | null) {
  if (value == null) {
    return "Not tracked";
  }

  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value));
}

function buildProductOptions(products: ProductRow[]): ProductOption[] {
  return [
    { id: "NEW_PRODUCT", title: "New product" },
    ...products.map((product) => ({
      id: product.id,
      title: `${product.name} - ${formatPriceLabel(product.unit_price)}`,
      description: `Price: ${formatPriceLabel(product.unit_price)} | Stock: ${formatStockLabel(product.stock_quantity)}`
    }))
  ];
}

function buildCustomerOptions(
  customers: Array<{ id: string; full_name: string; phone_number: string | null }>
): CustomerOption[] {
  return [
    { id: "NEW_CUSTOMER", title: "New customer" },
    ...customers.map((customer) => ({
      id: customer.id,
      title: customer.full_name,
      description: customer.phone_number ?? undefined
    }))
  ];
}

function pickState(data: Record<string, unknown> | undefined): FlowState {
  return {
    productId: typeof data?.productId === "string" ? data.productId : undefined,
    itemName: typeof data?.itemName === "string" ? data.itemName : undefined,
    unitPrice: typeof data?.unitPrice === "string" ? data.unitPrice : undefined,
    saveAsProduct: typeof data?.saveAsProduct === "string" ? data.saveAsProduct : undefined,
    customerMode: typeof data?.customerMode === "string" ? data.customerMode : undefined,
    customerId: typeof data?.customerId === "string" ? data.customerId : undefined,
    customerName: typeof data?.customerName === "string" ? data.customerName : undefined,
    customerPhone: typeof data?.customerPhone === "string" ? data.customerPhone : undefined,
    quantity: typeof data?.quantity === "string" ? data.quantity : undefined,
    amountPaid: typeof data?.amountPaid === "string" ? data.amountPaid : undefined,
    paymentStatus: typeof data?.paymentStatus === "string" ? data.paymentStatus : undefined,
    paymentMethod: typeof data?.paymentMethod === "string" ? data.paymentMethod : undefined
  };
}

function getLatestDate(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

async function handleFlowRequest(input: z.infer<typeof flowEndpointSchema>) {
  if (!input.flow_token) {
    return {
      version: "3.0",
      data: {
        status: "active"
      }
    };
  }

  const token = parseRecordSaleFlowToken(input.flow_token);

  if (!token) {
    return { error: "Invalid record sale flow token.", status: 400 as const };
  }

  const supabase = createSupabaseAdminClient();

  const { data: membership } = await supabase
    .from("business_memberships")
    .select("id")
    .eq("business_id", token.businessId)
    .eq("user_id", token.recordedBy)
    .maybeSingle();

  if (!membership) {
    return { error: "Vendor does not have access to this business.", status: 403 as const };
  }

  const [
    { data: products, error: productsError },
    { data: customers, error: customersError },
    { data: recentProductUsage },
    { data: recentCustomerUsage }
  ] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, unit_price, stock_quantity")
        .eq("business_id", token.businessId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(10),
      supabase
        .from("customers")
        .select("id, full_name, phone_number")
        .eq("business_id", token.businessId)
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("transaction_items")
        .select("product_id, line_total, transactions!inner(transaction_date)")
        .not("product_id", "is", null)
        .eq("transactions.business_id", token.businessId)
        .order("transaction_date", {
          foreignTable: "transactions",
          ascending: false
        })
        .limit(50),
      supabase
        .from("customers")
        .select("id, full_name, phone_number, transactions(transaction_date, total_amount)")
        .eq("business_id", token.businessId)
        .limit(20)
    ]);

  if (productsError || customersError) {
    return {
      error:
        productsError?.message ??
        customersError?.message ??
        "Unable to load products and customers.",
      status: 400 as const
    };
  }

  const state = pickState(input.data);
  const productUsageMap = new Map<
    string,
    { lastUsedAt: number; totalValue: number }
  >();

  for (const usage of (recentProductUsage ?? []) as RecentProductUsageRow[]) {
    if (!usage.product_id) {
      continue;
    }

    const current = productUsageMap.get(usage.product_id) ?? {
      lastUsedAt: 0,
      totalValue: 0
    };

    productUsageMap.set(usage.product_id, {
      lastUsedAt: Math.max(
        current.lastUsedAt,
        getLatestDate(usage.transactions?.[0]?.transaction_date)
      ),
      totalValue: current.totalValue + Number(usage.line_total ?? 0)
    });
  }

  const rankedProducts = [...((products ?? []) as ProductRow[])].sort((left, right) => {
    const leftUsage = productUsageMap.get(left.id) ?? { lastUsedAt: 0, totalValue: 0 };
    const rightUsage = productUsageMap.get(right.id) ?? { lastUsedAt: 0, totalValue: 0 };

    if (leftUsage.lastUsedAt !== rightUsage.lastUsedAt) {
      return rightUsage.lastUsedAt - leftUsage.lastUsedAt;
    }

    if (leftUsage.totalValue !== rightUsage.totalValue) {
      return rightUsage.totalValue - leftUsage.totalValue;
    }

    return left.name.localeCompare(right.name);
  });

  const rankedCustomers = [...((recentCustomerUsage ?? customers ?? []) as RecentCustomerUsageRow[])].sort(
    (left, right) => {
      const leftTransactions = left.transactions ?? [];
      const rightTransactions = right.transactions ?? [];
      const leftLastUsedAt = Math.max(...leftTransactions.map((item) => getLatestDate(item.transaction_date)), 0);
      const rightLastUsedAt = Math.max(
        ...rightTransactions.map((item) => getLatestDate(item.transaction_date)),
        0
      );

      if (leftLastUsedAt !== rightLastUsedAt) {
        return rightLastUsedAt - leftLastUsedAt;
      }

      const leftTotal = leftTransactions.reduce(
        (sum, item) => sum + Number(item.total_amount ?? 0),
        0
      );
      const rightTotal = rightTransactions.reduce(
        (sum, item) => sum + Number(item.total_amount ?? 0),
        0
      );

      if (leftTotal !== rightTotal) {
        return rightTotal - leftTotal;
      }

      return left.full_name.localeCompare(right.full_name);
    }
  );

  const productOptions = buildProductOptions(rankedProducts);
  const customerOptions = buildCustomerOptions(
    rankedCustomers.map((customer) => ({
      id: customer.id,
      full_name: customer.full_name,
      phone_number: customer.phone_number
    }))
  );
  const hasManualProductDetails = Boolean(state.itemName && state.unitPrice);

  if (!state.productId && !hasManualProductDetails) {
    return {
      screen: "SELECT_PRODUCT",
      data: {
        productOptions
      }
    };
  }

  if (state.productId === "NEW_PRODUCT" && !hasManualProductDetails) {
    return {
      screen: "NEW_PRODUCT",
      data: {}
    };
  }

  if (state.productId !== "NEW_PRODUCT" && !state.customerMode) {
    const product = (products ?? []).find((entry) => entry.id === state.productId);

    if (!product) {
      return { error: "Selected product does not belong to this business.", status: 400 as const };
    }

    return {
      screen: "CUSTOMER_SELECT",
      data: {
        customerOptions,
        productId: product.id,
        itemName: product.name,
        unitPrice: String(product.unit_price),
        saveAsProduct: "no"
      }
    };
  }

  if (hasManualProductDetails && !state.customerMode) {
    return {
      screen: "CUSTOMER_SELECT",
      data: {
        customerOptions,
        productId: "",
        itemName: state.itemName ?? "",
        unitPrice: state.unitPrice ?? "",
        saveAsProduct: state.saveAsProduct ?? "no"
      }
    };
  }

  if (state.customerMode === "NEW_CUSTOMER" && !state.customerName) {
    return {
      screen: "NEW_CUSTOMER",
      data: {
        productId: state.productId ?? "",
        itemName: state.itemName ?? "",
        unitPrice: state.unitPrice ?? "",
        saveAsProduct: state.saveAsProduct ?? "no"
      }
    };
  }

  if (
    state.customerMode &&
    state.customerMode !== "NEW_CUSTOMER" &&
    (!state.customerId || state.customerId !== state.customerMode)
  ) {
    return {
      screen: "PAYMENT_DETAILS",
      data: {
        productId: state.productId ?? "",
        itemName: state.itemName ?? "",
        unitPrice: state.unitPrice ?? "",
        saveAsProduct: state.saveAsProduct ?? "no",
        customerMode: state.customerMode,
        customerId: state.customerMode,
        customerName: "",
        customerPhone: "",
        quantity: "1",
        amountPaid: state.unitPrice ?? "",
        paymentStatus: "paid",
        paymentMethod: "cash"
      }
    };
  }

  if (state.customerMode === "NEW_CUSTOMER" && state.customerName) {
    return {
      screen: "PAYMENT_DETAILS",
      data: {
        productId: state.productId ?? "",
        itemName: state.itemName ?? "",
        unitPrice: state.unitPrice ?? "",
        saveAsProduct: state.saveAsProduct ?? "no",
        customerMode: "NEW_CUSTOMER",
        customerId: "",
        customerName: state.customerName,
        customerPhone: state.customerPhone ?? "",
        quantity: "1",
        amountPaid: state.unitPrice ?? "",
        paymentStatus: "paid",
        paymentMethod: "cash"
      }
    };
  }

  return {
    screen: "SELECT_PRODUCT",
    data: {
      productOptions
    }
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (isEncryptedFlowRequest(body)) {
    try {
      const decrypted = decryptWhatsAppFlowRequest<z.infer<typeof flowEndpointSchema>>(body);
      const responsePayload = await handleFlowRequest(flowEndpointSchema.parse(decrypted.payload));

      if ("error" in responsePayload) {
        return NextResponse.json(responsePayload, { status: responsePayload.status });
      }

      return new NextResponse(
        encryptWhatsAppFlowResponseBody(responsePayload, decrypted.aesKey, decrypted.initialVector),
        {
          status: 200,
          headers: {
            "Content-Type": "text/plain"
          }
        }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to process encrypted flow request.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const input = flowEndpointSchema.parse(body);
  const responsePayload = await handleFlowRequest(input);

  if ("error" in responsePayload) {
    return NextResponse.json({ error: responsePayload.error }, { status: responsePayload.status });
  }

  return NextResponse.json(responsePayload);
}
