import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  decryptWhatsAppFlowRequest,
  encryptWhatsAppFlowResponse,
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
};

type FlowState = {
  saleMode?: string;
  productId?: string;
  itemName?: string;
  unitPrice?: string;
  saveAsProduct?: string;
  customerMode?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
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

function buildProductOptions(products: ProductRow[]): ProductOption[] {
  return [
    { id: "NEW_ITEM", title: "Enter new item" },
    ...products.map((product) => ({
      id: product.id,
      title: `${product.name} - ${formatPriceLabel(product.unit_price)}`,
      description: `Price: ${formatPriceLabel(product.unit_price)}`
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
    saleMode: typeof data?.saleMode === "string" ? data.saleMode : undefined,
    productId: typeof data?.productId === "string" ? data.productId : undefined,
    itemName: typeof data?.itemName === "string" ? data.itemName : undefined,
    unitPrice: typeof data?.unitPrice === "string" ? data.unitPrice : undefined,
    saveAsProduct: typeof data?.saveAsProduct === "string" ? data.saveAsProduct : undefined,
    customerMode: typeof data?.customerMode === "string" ? data.customerMode : undefined,
    customerId: typeof data?.customerId === "string" ? data.customerId : undefined,
    customerName: typeof data?.customerName === "string" ? data.customerName : undefined,
    customerPhone: typeof data?.customerPhone === "string" ? data.customerPhone : undefined
  };
}

async function handleFlowRequest(input: z.infer<typeof flowEndpointSchema>) {
  if (!input.flow_token) {
    return {
      screen: input.screen ?? "SALE_MODE",
      data: {
        productOptions: [{ id: "NEW_ITEM", title: "Enter new item" }],
        customerOptions: [{ id: "NEW_CUSTOMER", title: "New customer" }]
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

  const [{ data: products, error: productsError }, { data: customers, error: customersError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, unit_price")
        .eq("business_id", token.businessId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("customers")
        .select("id, full_name, phone_number")
        .eq("business_id", token.businessId)
        .order("updated_at", { ascending: false })
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
  const productOptions = buildProductOptions((products ?? []) as ProductRow[]);
  const customerOptions = buildCustomerOptions(customers ?? []);

  if (!state.saleMode) {
    return {
      screen: "SALE_MODE",
      data: {
        productOptions,
        customerOptions
      }
    };
  }

  if (state.saleMode === "existing_product" && !state.productId) {
    return {
      screen: "SELECT_PRODUCT",
      data: {
        productOptions
      }
    };
  }

  if (state.saleMode === "new_item" && !state.itemName) {
    return {
      screen: "NEW_ITEM",
      data: {}
    };
  }

  if (state.saleMode === "existing_product" && state.productId && !state.customerMode) {
    const product = (products ?? []).find((entry) => entry.id === state.productId);

    if (!product) {
      return { error: "Selected product does not belong to this business.", status: 400 as const };
    }

    return {
      screen: "CUSTOMER_SELECT",
      data: {
        customerOptions,
        saleMode: "existing_product",
        productId: product.id,
        itemName: product.name,
        unitPrice: String(product.unit_price),
        saveAsProduct: "no"
      }
    };
  }

  if (state.saleMode === "new_item" && state.itemName && state.unitPrice && !state.customerMode) {
    return {
      screen: "CUSTOMER_SELECT",
      data: {
        customerOptions,
        saleMode: "new_item",
        productId: "",
        itemName: state.itemName,
        unitPrice: state.unitPrice,
        saveAsProduct: state.saveAsProduct ?? "no"
      }
    };
  }

  if (state.customerMode === "NEW_CUSTOMER" && !state.customerName) {
    return {
      screen: "NEW_CUSTOMER",
      data: {
        saleMode: state.saleMode ?? "",
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
        saleMode: state.saleMode ?? "",
        productId: state.productId ?? "",
        itemName: state.itemName ?? "",
        unitPrice: state.unitPrice ?? "",
        saveAsProduct: state.saveAsProduct ?? "no",
        customerMode: state.customerMode,
        customerId: state.customerMode,
        customerName: "",
        customerPhone: ""
      }
    };
  }

  if (state.customerMode === "NEW_CUSTOMER" && state.customerName) {
    return {
      screen: "PAYMENT_DETAILS",
      data: {
        saleMode: state.saleMode ?? "",
        productId: state.productId ?? "",
        itemName: state.itemName ?? "",
        unitPrice: state.unitPrice ?? "",
        saveAsProduct: state.saveAsProduct ?? "no",
        customerMode: "NEW_CUSTOMER",
        customerId: "",
        customerName: state.customerName,
        customerPhone: state.customerPhone ?? ""
      }
    };
  }

  return {
    screen: "SALE_MODE",
    data: {
      productOptions,
      customerOptions
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

      return NextResponse.json(
        encryptWhatsAppFlowResponse(responsePayload, decrypted.aesKey, decrypted.initialVector)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to process encrypted flow request.";
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
