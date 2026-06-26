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

type ProductRow = {
  id: string;
  name: string;
  unit_price: number | string;
  stock_quantity: number | string | null;
  is_active: boolean;
};

type RecentProductUsageRow = {
  product_id: string | null;
  line_total: number | string | null;
  quantity: number | string | null;
  transactions:
    | Array<{
        transaction_date: string;
      }>
    | null;
};

type FlowState = {
  productId?: string;
};

function parseProductsFlowToken(flowToken: string) {
  const [prefix, businessId, recordedBy, intent, productId] = flowToken.split(":");

  if (prefix !== "products" || !businessId || !recordedBy) {
    return null;
  }

  return {
    businessId,
    recordedBy,
    intent: intent === "add" || intent === "edit" ? intent : undefined,
    productId: intent === "edit" && productId ? productId : undefined
  };
}

function formatMoney(value: number | string | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function formatQuantity(value: number | string | null) {
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
    {
      id: "NEW_PRODUCT",
      title: "Add new product",
      description: "Create a new item for future sales"
    },
    ...products.map((product) => ({
      id: product.id,
      title: product.name,
      description: `₦${formatMoney(product.unit_price)} | Stock: ${formatQuantity(product.stock_quantity)}`
    }))
  ];
}

function pickState(data: Record<string, unknown> | undefined): FlowState {
  return {
    productId: typeof data?.productId === "string" ? data.productId : undefined
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

  const token = parseProductsFlowToken(input.flow_token);

  if (!token) {
    return { error: "Invalid products flow token.", status: 400 as const };
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

  const [{ data: products, error: productsError }, { data: recentProductUsage }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, unit_price, stock_quantity, is_active")
      .eq("business_id", token.businessId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("transaction_items")
      .select("product_id, line_total, quantity, transactions!inner(transaction_date)")
      .not("product_id", "is", null)
      .eq("transactions.business_id", token.businessId)
      .order("transaction_date", {
        foreignTable: "transactions",
        ascending: false
      })
      .limit(50)
  ]);

  if (productsError) {
    return {
      error: productsError.message ?? "Unable to load products.",
      status: 400 as const
    };
  }

  const productUsageMap = new Map<string, { lastUsedAt: number; totalValue: number; totalQuantity: number }>();

  for (const usage of (recentProductUsage ?? []) as RecentProductUsageRow[]) {
    if (!usage.product_id) {
      continue;
    }

    const current = productUsageMap.get(usage.product_id) ?? {
      lastUsedAt: 0,
      totalValue: 0,
      totalQuantity: 0
    };

    productUsageMap.set(usage.product_id, {
      lastUsedAt: Math.max(
        current.lastUsedAt,
        getLatestDate(usage.transactions?.[0]?.transaction_date)
      ),
      totalValue: current.totalValue + Number(usage.line_total ?? 0),
      totalQuantity: current.totalQuantity + Number(usage.quantity ?? 0)
    });
  }

  const rankedProducts = [...((products ?? []) as ProductRow[])].sort((left, right) => {
    const leftUsage = productUsageMap.get(left.id) ?? { lastUsedAt: 0, totalValue: 0, totalQuantity: 0 };
    const rightUsage = productUsageMap.get(right.id) ?? { lastUsedAt: 0, totalValue: 0, totalQuantity: 0 };

    if (leftUsage.lastUsedAt !== rightUsage.lastUsedAt) {
      return rightUsage.lastUsedAt - leftUsage.lastUsedAt;
    }

    if (leftUsage.totalValue !== rightUsage.totalValue) {
      return rightUsage.totalValue - leftUsage.totalValue;
    }

    if (leftUsage.totalQuantity !== rightUsage.totalQuantity) {
      return rightUsage.totalQuantity - leftUsage.totalQuantity;
    }

    return left.name.localeCompare(right.name);
  });

  const state = pickState(input.data);

  if (!state.productId && token.intent === "add") {
    return {
      screen: "NEW_PRODUCT",
      data: {}
    };
  }

  if (!state.productId && token.intent === "edit" && token.productId) {
    const product = rankedProducts.find((entry) => entry.id === token.productId);

    if (!product) {
      return { error: "Selected product does not belong to this business.", status: 400 as const };
    }

    return {
      screen: "UPDATE_PRODUCT",
      data: {
        productId: product.id,
        currentName: product.name,
        currentPrice: String(product.unit_price),
        currentStock: product.stock_quantity == null ? "" : String(product.stock_quantity),
        currentActive: product.is_active ? "active" : "inactive"
      }
    };
  }

  if (!state.productId) {
    return {
      screen: "SELECT_PRODUCT",
      data: {
        productOptions: buildProductOptions(rankedProducts)
      }
    };
  }

  if (state.productId === "NEW_PRODUCT") {
    return {
      screen: "NEW_PRODUCT",
      data: {}
    };
  }

  const product = rankedProducts.find((entry) => entry.id === state.productId);

  if (!product) {
    return { error: "Selected product does not belong to this business.", status: 400 as const };
  }

  return {
    screen: "UPDATE_PRODUCT",
    data: {
      productId: product.id,
      currentName: product.name,
      currentPrice: String(product.unit_price),
      currentStock: product.stock_quantity == null ? "" : String(product.stock_quantity),
      currentActive: product.is_active ? "active" : "inactive"
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
