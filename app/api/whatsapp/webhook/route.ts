import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { candidatePhoneNumbers, normalizePhoneNumber } from "@/lib/phone";
import { getVendorReport, getVendorDashboardSummary } from "@/lib/reports";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashPin, isPinSessionActive, parsePinCommand, verifyPin } from "@/lib/whatsapp-identity";
import {
  buildFlowToken,
  formatNaira,
  getConfiguredFlowId,
  normalizeIncomingWhatsAppText,
  parseFlowResponseJson,
  sendWhatsAppListMessage,
  sendWhatsAppReplyButtonsMessage,
  sendWhatsAppTypingIndicator,
  sendWhatsAppFlowMessage,
  sendWhatsAppTextMessage,
  verifyWhatsAppSignature
} from "@/lib/whatsapp";

type WhatsAppMessage = {
  from?: string;
  type?: string;
  text?: { body?: string };
  interactive?: {
    type?: string;
    nfm_reply?: { name?: string; body?: string; response_json?: string };
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string; description?: string };
  };
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

const ICE_BREAKERS = {
  registerBusiness: "register my business",
  recordSale: "record a sale",
  viewProducts: "view products",
  businessHelp: "business help"
} as const;

const COMMANDS = {
  sale: "/sale",
  products: "/products",
  reports: "/reports",
  feedback: "/feedback"
} as const;

function parseBooleanLike(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "yes") {
      return true;
    }

    if (normalized === "false" || normalized === "no") {
      return false;
    }
  }

  return false;
}

async function sendVendorMenu(sender: string, businessId: string, ownerName: string) {
  await sendWhatsAppTextMessage(
    sender,
    [
      "👋 *Business Assistant Menu*",
      "",
      "Here's what I can help you with:",
      "",
      "📈 */sale*",
      "Record a new sale.",
      "",
      "📦 */products*",
      "View and manage your products.",
      "",
      "📊 */reports*",
      "See your daily, weekly, and monthly business reports.",
      "",
      "💬 */feedback*",
      "Share your ideas or report an issue to help us improve Binda.",
      "",
      "Simply type any command above to get started."
    ].join("\n")
  );
}

async function sendPinPrompt(sender: string, hasPin: boolean) {
  await sendWhatsAppTextMessage(
    sender,
    hasPin
      ? "For security, enter your 4-digit PIN to continue.\nReply like: PIN 1234"
      : "For security, set a 4-digit PIN first.\nReply like: SET PIN 1234"
  );
}

async function sendOnboardingFlowOrFallback(sender: string) {
  const flowId = getConfiguredFlowId("onboarding");

  if (!flowId) {
    return sendWhatsAppTextMessage(
      sender,
      "Welcome to Binda. Your business setup Flow is not configured yet. Please ask the admin to add the onboarding Flow ID."
    );
  }

  return sendWhatsAppFlowMessage(sender, {
    body: `
    Hi 👋 Welcome to *Binda*!

Your Business Assistant.

I'll help you:

\`- Keep your sales records\`
\`- Track your customers\`
\`- Show daily and monthly reports\`
\`- Help more customers discover your business\`

Tap *Start setup* to continue.`,
    cta: "Start setup",
    flowId,
    flowToken: buildFlowToken("onboarding", [sender]),
    screen: "BUSINESS_SETUP",
    data: {
      whatsappPhone: normalizePhoneNumber(sender)
    }
  });
}

async function sendRecordSaleFlowOrFallback(
  sender: string,
  business: { id: string; business_name: string },
  recordedBy: string | null
) {
  const flowId = getConfiguredFlowId("record_sale");

  if (!flowId || !recordedBy) {
    return sendWhatsAppTextMessage(
      sender,
      "Record Sale Flow is not ready yet. Use the dashboard for now, or ask the admin to complete the Flow setup."
    );
  }

  return sendWhatsAppFlowMessage(sender, {
    body: `
    *Record Sale*

Record a new sale for ${business.business_name}.`,
    cta: "Record sale",
    flowId,
    flowToken: buildFlowToken("record_sale", [business.id, recordedBy])
  });
}

async function sendFlowLaunchOrError(
  sender: string,
  buildMessage: () => Promise<{ ok: boolean; data?: unknown; status?: number; reason?: string }>
) {
  const response = await buildMessage();

  if (response.ok) {
    return true;
  }

  const errorMessage =
    typeof response.data === "object" &&
    response.data !== null &&
    "error" in response.data &&
    typeof (response.data as { error?: { message?: string } }).error?.message === "string"
      ? (response.data as { error: { message: string } }).error.message
      : response.reason ?? "WhatsApp rejected the Flow launch.";

  await sendWhatsAppTextMessage(sender, `I could not open that form yet. ${errorMessage}`);
  return false;
}

async function sendProductsFlowForIntent(
  sender: string,
  businessId: string,
  recordedBy: string,
  intent: "add" | "edit",
  productId?: string
) {
  const flowId = getConfiguredFlowId(intent === "add" ? "add_product" : "update_product");

  if (!flowId) {
    await sendWhatsAppTextMessage(
      sender,
      "That product form is not configured yet. Ask the admin to publish the product flows."
    );
    return false;
  }

  const tokenParts =
    intent === "add"
      ? ["add_product", businessId, recordedBy]
      : ["update_product", businessId, recordedBy, productId ?? ""];

  return sendFlowLaunchOrError(sender, () =>
    sendWhatsAppFlowMessage(sender, {
      body: intent === "add" ? "Add a new product." : "Update your product.",
      cta: intent === "add" ? "Add product" : "Update product",
      flowId,
      flowToken: tokenParts.join(":")
    })
  );
}

function formatProductListMoney(value: number | string | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function formatProductListStock(value: number | string | null) {
  if (value == null) {
    return "Not tracked";
  }

  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value));
}

function getLatestDate(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

async function getTopProductsForList(businessId: string, limit = 9) {
  const admin = createSupabaseAdminClient();
  const [{ data: products, error: productsError }, { data: recentProductUsage }] = await Promise.all([
    admin
      .from("products")
      .select("id, name, unit_price, stock_quantity, is_active")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(limit),
    admin
      .from("transaction_items")
      .select("product_id, line_total, quantity, transactions!inner(transaction_date)")
      .not("product_id", "is", null)
      .eq("transactions.business_id", businessId)
      .order("transaction_date", {
        foreignTable: "transactions",
        ascending: false
      })
      .limit(50)
  ]);

  if (productsError) {
    throw new Error(productsError.message ?? "Unable to load products.");
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

  return [...((products ?? []) as ProductRow[])].sort((left, right) => {
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
}

async function sendProductsPickerOrFallback(
  sender: string,
  business: { id: string; business_name: string },
  recordedBy: string | null
) {
  const addFlowId = getConfiguredFlowId("add_product");
  const updateFlowId = getConfiguredFlowId("update_product");

  if (!addFlowId || !updateFlowId || !recordedBy) {
    return sendWhatsAppTextMessage(
      sender,
      "Product flows are not ready yet. Use the dashboard for now, or ask the admin to complete the Product Flow setup."
    );
  }

  const products = await getTopProductsForList(business.id);
  const rows = [
    ...products.map((product) => ({
      id: `products:edit:${product.id}`,
      title: product.name.slice(0, 24),
      description: `₦${formatProductListMoney(product.unit_price)} | Stock: ${formatProductListStock(product.stock_quantity)}`.slice(0, 72)
    })),
    {
      id: "products:add",
      title: "Add new product",
      description: "Create a new item for future sales"
    }
  ];

  return sendWhatsAppListMessage(sender, {
    header: "Manage Products",
    body: `Choose a product for ${business.business_name}.`,
    footer: "Tap an item to select it",
    button: "Manage Products",
    sections: [
      {
        title: "Products",
        rows
      }
    ]
  });
}

async function sendProductsEntryOptions(sender: string) {
  return sendWhatsAppReplyButtonsMessage(sender, {
    body: "What would you like to do with your products?",
    buttons: [
      { id: "products:view", title: "View Products" },
      { id: "products:manage", title: "Manage Products" }
    ]
  });
}

async function sendViewProductsPickerOrFallback(
  sender: string,
  business: { id: string; business_name: string }
) {
  const products = await getTopProductsForList(business.id, 10);
  const rows = products.map((product) => ({
    id: `products:view:${product.id}`,
    title: product.name.slice(0, 24),
    description: `₦${formatProductListMoney(product.unit_price)} | Stock: ${formatProductListStock(product.stock_quantity)}`.slice(0, 72)
  }));

  if (rows.length === 0) {
    return sendWhatsAppTextMessage(
      sender,
      "You do not have any active products yet. Reply 2 and choose Manage Products to add one."
    );
  }

  return sendWhatsAppListMessage(sender, {
    header: "View Products",
    body: `Choose a product to view for ${business.business_name}.`,
    footer: "Tap an item to view details",
    button: "View Products",
    sections: [
      {
        title: "Products",
        rows
      }
    ]
  });
}

async function sendProductSummary(sender: string, businessId: string, productId: string) {
  const admin = createSupabaseAdminClient();
  const [{ data: product }, { data: itemRows }] = await Promise.all([
    admin
      .from("products")
      .select("id, name, unit_price, stock_quantity, is_active")
      .eq("id", productId)
      .eq("business_id", businessId)
      .maybeSingle<ProductRow>(),
    admin
      .from("transaction_items")
      .select("quantity, line_total, transactions!inner(business_id, transaction_date)")
      .eq("product_id", productId)
      .eq("transactions.business_id", businessId)
  ]);

  if (!product) {
    await sendWhatsAppTextMessage(sender, "I could not find that product. Reply 2 to reload your products.");
    return;
  }

  const rows = itemRows ?? [];
  const totalQuantitySold = rows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
  const totalSales = rows.reduce((sum, row) => sum + Number(row.line_total ?? 0), 0);
  const lastSoldAt = rows
    .map((row) => {
      const transaction = Array.isArray(row.transactions) ? row.transactions[0] : row.transactions;
      return transaction?.transaction_date ?? null;
    })
    .filter(Boolean)
    .sort()
    .at(-1);

  await sendWhatsAppTextMessage(
    sender,
    [
      `Product: ${product.name}`,
      `Price: ${formatNaira(Number(product.unit_price ?? 0))}`,
      `Stock: ${formatProductListStock(product.stock_quantity)}`,
      `Status: ${product.is_active ? "Active" : "Inactive"}`,
      `Total quantity sold: ${new Intl.NumberFormat("en-NG", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(totalQuantitySold)}`,
      `Total sales: ${formatNaira(totalSales)}`,
      `Last sold: ${lastSoldAt ? new Date(lastSoldAt).toLocaleDateString("en-NG") : "No sales yet"}`
    ].join("\n")
  );
}

async function handleFlowCompletion(message: WhatsAppMessage, sender: string) {
  const reply = message.interactive?.nfm_reply;
  const response = parseFlowResponseJson(reply?.response_json);

  if (!response) {
    await sendWhatsAppTextMessage(sender, "I received the Flow reply, but I could not read its data.");
    return;
  }

  const flowToken = String(response.flow_token ?? "");

  if (flowToken.startsWith("onboarding:")) {
    const admin = createSupabaseAdminClient();
    const payload = {
      businessName: String(response.businessName ?? ""),
      ownerName: String(response.ownerName ?? ""),
      whatsappPhone: normalizePhoneNumber(sender),
      email:
        typeof response.email === "string" && response.email.length > 0 ? response.email : undefined,
      password:
        typeof response.password === "string" && response.password.length > 0
          ? response.password
          : undefined,
      accessPin:
        typeof response.accessPin === "string" && response.accessPin.length > 0
          ? response.accessPin
          : undefined,
      categoryId: String(response.categoryId ?? ""),
      locationArea: String(response.locationArea ?? ""),
      otherLocationArea:
        typeof response.otherLocationArea === "string" && response.otherLocationArea.length > 0
          ? response.otherLocationArea
          : undefined,
      productsServices: String(response.productsServices ?? ""),
      profileImageUrl:
        typeof response.profileImageUrl === "string" && response.profileImageUrl.length > 0
          ? response.profileImageUrl
          : undefined
    };

    const onboardingResponse = await fetch(`${env.appBaseUrl}/api/whatsapp/flows/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!onboardingResponse.ok) {
      const error = await onboardingResponse.json().catch(() => null);
      await sendWhatsAppTextMessage(
        sender,
        `I could not save your business setup yet. ${error?.error ?? "Please try again."}`
      );
      return;
    }

    const data = await onboardingResponse.json();
    await sendWhatsAppTextMessage(
      sender,
      data.userId
        ? `
        🎉 Your business is ready!

From today, I'll help you keep accurate records and understand how your business '${data.business.business_name}' is performing.

Whenever you make a sale, just tap */Record Sale*.`
        : `
        🎉 Your business is ready!

From today, I'll help you keep accurate records and understand how your business '${data.business.business_name}' is performing.

Whenever you make a sale, just tap */Record Sale*.`
    );
    await sendVendorMenu(sender, data.business.id, payload.ownerName);
    return;
  }

  if (flowToken.startsWith("record_sale:")) {
    const [, businessId, recordedBy] = flowToken.split(":");
    const productId =
      typeof response.productId === "string" && response.productId.length > 0
        ? response.productId
        : undefined;
    const customerMode =
      typeof response.customerMode === "string" && response.customerMode.length > 0
        ? response.customerMode
        : undefined;
    const customerId =
      typeof response.customerId === "string" && response.customerId.length > 0
        ? response.customerId
        : customerMode && customerMode !== "NEW_CUSTOMER"
          ? customerMode
          : null;
    const items = [
      {
        productId,
        itemName: String(response.itemName ?? response.productName ?? "Sale item"),
        quantity: Number(response.quantity ?? 1),
        unitPrice: Number(response.unitPrice ?? response.amount ?? 0),
        stockQuantity:
          typeof response.stockQuantity === "string" && response.stockQuantity.length > 0
            ? Number(response.stockQuantity)
            : null
      }
    ];

    const salePayload = {
      businessId,
      customerId,
      customerMode,
      customerName:
        typeof response.customerName === "string" && response.customerName.length > 0
          ? response.customerName
          : undefined,
      customerPhone:
        typeof response.customerPhone === "string" && response.customerPhone.length > 0
          ? response.customerPhone
          : undefined,
      recordedBy,
      saleMode:
        response.saleMode === "existing_product" || response.saleMode === "new_item"
          ? response.saleMode
          : undefined,
      saveAsProduct:
        response.saveAsProduct === "yes" || response.saveAsProduct === "no"
          ? response.saveAsProduct
          : undefined,
      paymentStatus: String(response.paymentStatus ?? "paid"),
      paymentMethod: String(response.paymentMethod ?? "cash"),
      amountPaid: Number(response.amountPaid ?? response.amount ?? 0),
      notes: typeof response.notes === "string" ? response.notes : undefined,
      items
    };

    const saleResponse = await fetch(`${env.appBaseUrl}/api/whatsapp/flows/record-sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(salePayload)
    });

    const result = await saleResponse.json().catch(() => null);
    await sendWhatsAppTextMessage(
      sender,
      saleResponse.ok
        ? result?.message ?? "Sale recorded successfully."
        : `I could not record that sale yet. ${result?.error ?? "Please try again."}`
    );
    return;
  }

  if (flowToken.startsWith("add_product:") || flowToken.startsWith("update_product:")) {
    const [, businessId, recordedBy] = flowToken.split(":");
    const productId =
      typeof response.productId === "string" && response.productId.length > 0
        ? response.productId
        : undefined;
    const mode = productId && productId !== "NEW_PRODUCT" ? "update" : "create";
    const payload =
      mode === "create"
        ? {
            businessId,
            recordedBy,
            mode,
            productName: String(response.productName ?? ""),
            unitPrice: Number(response.unitPrice ?? 0),
            stockQuantity:
              typeof response.stockQuantity === "string" && response.stockQuantity.length > 0
                ? Number(response.stockQuantity)
                : null
          }
        : {
            businessId,
            recordedBy,
            mode,
            productId,
            productName:
              typeof response.productName === "string" && response.productName.length > 0
                ? response.productName
                : undefined,
            unitPrice:
              typeof response.unitPrice === "string" && response.unitPrice.length > 0
                ? Number(response.unitPrice)
                : undefined,
            stockQuantity:
              typeof response.stockQuantity === "string" && response.stockQuantity.length > 0
                ? Number(response.stockQuantity)
                : undefined,
            availabilityAction:
              response.availabilityAction === "active" ||
              response.availabilityAction === "inactive" ||
              response.availabilityAction === "keep"
                ? response.availabilityAction
                : undefined
          };

    const productResponse = await fetch(`${env.appBaseUrl}/api/whatsapp/flows/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await productResponse.json().catch(() => null);
    await sendWhatsAppTextMessage(
      sender,
      productResponse.ok
        ? result?.message ?? "Product saved successfully."
        : `I could not save that product yet. ${result?.error ?? "Please try again."}`
    );

    if (productResponse.ok) {
      await sendWhatsAppTextMessage(
        sender,
        [
          "What would you like to do next?",
          "2 or Products",
          "1 or Record Sale",
          "Menu"
        ].join("\n")
      );
    }
    return;
  }

  await sendWhatsAppTextMessage(sender, "Flow response received.");
}

async function handleVendorCommand(
  message: WhatsAppMessage,
  sender: string,
  business: { id: string; owner_name: string; business_name: string; location_area?: string }
) {
  const admin = createSupabaseAdminClient();
  const normalized = normalizeIncomingWhatsAppText(message);
  const pinCommand = parsePinCommand(normalized);
  const { data: identity } = await admin
    .from("whatsapp_auth_identities")
    .select("id, user_id, phone_number, pin_salt, pin_hash, last_verified_at, failed_attempts, locked_until")
    .eq("business_id", business.id)
    .maybeSingle();

  const lockedUntil = identity?.locked_until ? new Date(identity.locked_until) : null;
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    await sendWhatsAppTextMessage(
      sender,
      `Too many wrong PIN attempts. Try again after ${lockedUntil.toLocaleTimeString()}.`
    );
    return;
  }

  if (pinCommand?.type === "lock") {
    if (identity?.id) {
      await admin.from("whatsapp_auth_identities").update({ last_verified_at: null }).eq("id", identity.id);
    }

    await sendWhatsAppTextMessage(sender, "Your WhatsApp session has been locked.");
    return;
  }

  if (pinCommand?.type === "set") {
    const pinValues = hashPin(pinCommand.pin);

    await admin.from("whatsapp_auth_identities").upsert({
      business_id: business.id,
      user_id: identity?.user_id ?? null,
      phone_number: normalizePhoneNumber(sender),
      pin_salt: pinValues.salt,
      pin_hash: pinValues.hash,
      last_verified_at: new Date().toISOString(),
      failed_attempts: 0,
      locked_until: null
    });

    await sendWhatsAppTextMessage(
      sender,
      "Your 4-digit PIN has been set. You are now verified for WhatsApp business actions."
    );
    await sendVendorMenu(sender, business.id, business.owner_name);
    return;
  }

  const hasPin = Boolean(identity?.pin_hash && identity?.pin_salt);

  if (pinCommand?.type === "verify" && identity?.pin_hash && identity?.pin_salt) {
    const correct = verifyPin(pinCommand.pin, identity.pin_salt, identity.pin_hash);

    if (!correct) {
      const failedAttempts = (identity.failed_attempts ?? 0) + 1;
      const locked_until = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

      await admin
        .from("whatsapp_auth_identities")
        .update({
          failed_attempts: failedAttempts,
          locked_until
        })
        .eq("id", identity.id);

      await sendWhatsAppTextMessage(
        sender,
        locked_until
          ? "Too many wrong PIN attempts. Your WhatsApp access is locked for 15 minutes."
          : "Incorrect PIN. Try again with: PIN 1234"
      );
      return;
    }

    await admin
      .from("whatsapp_auth_identities")
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_verified_at: new Date().toISOString()
      })
      .eq("id", identity.id);

    await sendWhatsAppTextMessage(sender, "PIN verified.");
    await sendVendorMenu(sender, business.id, business.owner_name);
    return;
  }

  const isVerified = isPinSessionActive(identity?.last_verified_at, env.whatsappPinSessionMinutes);

  if (!hasPin || !isVerified) {
    await sendPinPrompt(sender, hasPin);
    return;
  }

  const buttonReplyId =
    message.interactive?.type === "button_reply" ? message.interactive.button_reply?.id : undefined;
  const listReplyId = message.interactive?.type === "list_reply" ? message.interactive.list_reply?.id : undefined;

  if (buttonReplyId === "products:view") {
    await sendViewProductsPickerOrFallback(sender, business);
    return;
  }

  if (buttonReplyId === "products:manage") {
    const { data: membership } = await admin
      .from("business_memberships")
      .select("user_id")
      .eq("business_id", business.id)
      .limit(1)
      .maybeSingle();

    await sendProductsPickerOrFallback(sender, business, membership?.user_id ?? null);
    return;
  }

  if (listReplyId?.startsWith("products:")) {
    const { data: membership } = await admin
      .from("business_memberships")
      .select("user_id")
      .eq("business_id", business.id)
      .limit(1)
      .maybeSingle();

    const recordedBy = membership?.user_id ?? null;

    if (!recordedBy) {
      await sendWhatsAppTextMessage(
        sender,
        "Product flows are not ready yet. Use the dashboard for now, or ask the admin to complete the Product Flow setup."
      );
      return;
    }

    if (listReplyId.startsWith("products:view:")) {
      await sendProductSummary(sender, business.id, listReplyId.replace("products:view:", ""));
      return;
    }

    if (listReplyId === "products:add") {
      await sendProductsFlowForIntent(sender, business.id, recordedBy, "add");
      return;
    }

    const productId = listReplyId.replace("products:edit:", "");
    const { data: product } = await admin
      .from("products")
      .select("id, name, unit_price, stock_quantity, is_active")
      .eq("id", productId)
      .eq("business_id", business.id)
      .maybeSingle<ProductRow>();

    if (!product) {
      await sendWhatsAppTextMessage(sender, "I could not find that product. Reply 2 to reload your products.");
      return;
    }

    await sendProductsFlowForIntent(sender, business.id, recordedBy, "edit", product.id);
    return;
  }

  if (normalized === ICE_BREAKERS.registerBusiness) {
    await sendWhatsAppTextMessage(
      sender,
      `Your business is already linked as ${business.business_name}. Reply \`Menu\` to continue.`
    );
    return;
  }

  if (normalized === ICE_BREAKERS.recordSale) {
    const { data: membership } = await admin
      .from("business_memberships")
      .select("user_id")
      .eq("business_id", business.id)
      .limit(1)
      .maybeSingle();

    await sendRecordSaleFlowOrFallback(sender, business, membership?.user_id ?? null);
    return;
  }

  if (normalized === ICE_BREAKERS.viewProducts) {
    await sendViewProductsPickerOrFallback(sender, business);
    return;
  }

  if (normalized === ICE_BREAKERS.businessHelp) {
    await sendVendorMenu(sender, business.id, business.owner_name);
    return;
  }

  if (normalized === COMMANDS.sale) {
    const { data: membership } = await admin
      .from("business_memberships")
      .select("user_id")
      .eq("business_id", business.id)
      .limit(1)
      .maybeSingle();

    await sendRecordSaleFlowOrFallback(sender, business, membership?.user_id ?? null);
    return;
  }

  if (normalized === COMMANDS.products) {
    await sendViewProductsPickerOrFallback(sender, business);
    return;
  }

  if (normalized === COMMANDS.reports) {
    const report = await getVendorReport(business.id, "today", admin);
    await sendWhatsAppTextMessage(
      sender,
      [
        `Today's report for ${business.business_name}`,
        `Total Sales: ${formatNaira(report.totalSales)}`,
        `Transactions: ${report.transactionsCount}`,
        `Money Collected: ${formatNaira(report.paidAmount)}`,
        `Pending Payment: ${formatNaira(report.pendingAmount)}`
      ].join("\n")
    );
    return;
  }

  if (normalized === COMMANDS.feedback) {
    await sendWhatsAppTextMessage(
      sender,
      "Reply with your feedback in one message. Start it with `Feedback:` so I can pick it out easily."
    );
    return;
  }

  if (!normalized || ["menu", "start", "hi", "hello", "help"].includes(normalized)) {
    await sendVendorMenu(sender, business.id, business.owner_name);
    return;
  }

  await sendVendorMenu(sender, business.id, business.owner_name);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.whatsappVerifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyWhatsAppSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0] as WhatsAppMessage | undefined;
  const sender = message?.from;
  const messageId =
    typeof payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id === "string"
      ? payload.entry[0].changes[0].value.messages[0].id
      : null;
  const senderCandidates = sender ? candidatePhoneNumbers(sender) : [];

  if (!sender) {
    return NextResponse.json({ received: true });
  }

  if (messageId) {
    await sendWhatsAppTypingIndicator(messageId);
  }

  if (message?.type === "interactive" && message.interactive?.type === "nfm_reply") {
    await handleFlowCompletion(message, sender);
    return NextResponse.json({ received: true });
  }

  const admin = createSupabaseAdminClient();
  let { data: business } = await admin
    .from("businesses")
    .select("id, owner_name, business_name, location_area")
    .in("whatsapp_phone", senderCandidates)
    .maybeSingle();

  if (!business) {
    const { data: identity } = await admin
      .from("whatsapp_auth_identities")
      .select("business_id")
      .in("phone_number", senderCandidates)
      .maybeSingle();

    if (identity?.business_id) {
      const fallbackBusiness = await admin
        .from("businesses")
        .select("id, owner_name, business_name, location_area")
        .eq("id", identity.business_id)
        .maybeSingle();

      business = fallbackBusiness.data ?? null;
    }
  }

  if (!business) {
    await sendOnboardingFlowOrFallback(sender);
    return NextResponse.json({ received: true });
  }

  await handleVendorCommand(message ?? {}, sender, business);

  return NextResponse.json({ received: true });
}
