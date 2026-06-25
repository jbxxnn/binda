import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { getVendorReport, getVendorDashboardSummary } from "@/lib/reports";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildFlowToken,
  formatNaira,
  getConfiguredFlowId,
  normalizeIncomingWhatsAppText,
  parseFlowResponseJson,
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
    list_reply?: { id?: string; title?: string };
  };
};

function normalizePhoneNumber(phone: string) {
  return phone.startsWith("+") ? phone : `+${phone}`;
}

async function sendVendorMenu(sender: string, businessId: string, ownerName: string) {
  const admin = createSupabaseAdminClient();
  const summary = await getVendorDashboardSummary(businessId, admin);

  await sendWhatsAppTextMessage(
    sender,
    [
      `Welcome back, ${ownerName}`,
      "",
      `Today's Sales: ${formatNaira(summary.todaySales)}`,
      `Transactions Today: ${summary.transactionsToday}`,
      `Pending Payments: ${formatNaira(summary.pendingPayments)}`,
      "",
      "Reply with any of these:",
      "1 or Record Sale",
      "2 or Products",
      "3 or Customers",
      "4 or Reports",
      "5 or Business Profile",
      "6 or Settings"
    ].join("\n")
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
    body: "Let’s set up your business in a few quick steps.",
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
    body: `Record a new sale for ${business.business_name}.`,
    cta: "Record sale",
    flowId,
    flowToken: buildFlowToken("record_sale", [business.id, recordedBy]),
    screen: "RECORD_SALE",
    data: {
      businessId: business.id,
      recordedBy
    }
  });
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
      phoneNumber: String(response.phoneNumber ?? normalizePhoneNumber(sender)),
      whatsappPhone: String(response.whatsappPhone ?? normalizePhoneNumber(sender)),
      categoryId: String(response.categoryId ?? ""),
      locationArea: String(response.locationArea ?? ""),
      deliveryAvailable: Boolean(response.deliveryAvailable ?? false),
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
      `Your business setup for ${data.business.business_name} has been saved. Next step: use the web dashboard to sign in and finish linking your account.`
    );
    return;
  }

  if (flowToken.startsWith("record_sale:")) {
    const [, businessId, recordedBy] = flowToken.split(":");
    const items = [
      {
        productId:
          typeof response.productId === "string" && response.productId.length > 0
            ? response.productId
            : undefined,
        itemName: String(response.itemName ?? response.productName ?? "Sale item"),
        quantity: Number(response.quantity ?? 1),
        unitPrice: Number(response.unitPrice ?? response.amount ?? 0)
      }
    ];

    const salePayload = {
      businessId,
      customerId:
        typeof response.customerId === "string" && response.customerId.length > 0
          ? response.customerId
          : null,
      recordedBy,
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

  await sendWhatsAppTextMessage(sender, "Flow response received.");
}

async function handleVendorCommand(
  message: WhatsAppMessage,
  sender: string,
  business: { id: string; owner_name: string; business_name: string; location_area?: string }
) {
  const admin = createSupabaseAdminClient();
  const normalized = normalizeIncomingWhatsAppText(message);

  if (!normalized || ["menu", "start", "hi", "hello", "help"].includes(normalized)) {
    await sendVendorMenu(sender, business.id, business.owner_name);
    return;
  }

  if (normalized.includes("1") || normalized.includes("record sale")) {
    const { data: membership } = await admin
      .from("business_memberships")
      .select("user_id")
      .eq("business_id", business.id)
      .limit(1)
      .maybeSingle();

    await sendRecordSaleFlowOrFallback(sender, business, membership?.user_id ?? null);
    return;
  }

  if (normalized.includes("2") || normalized.includes("product")) {
    const dashboardUrl = `${env.appBaseUrl}/vendor/products`;
    await sendWhatsAppTextMessage(
      sender,
      `Open your products page here: ${dashboardUrl}\nYou can add items, set prices, and mark them active or inactive.`
    );
    return;
  }

  if (normalized.includes("3") || normalized.includes("customer")) {
    const dashboardUrl = `${env.appBaseUrl}/vendor/customers`;
    await sendWhatsAppTextMessage(
      sender,
      `Open your customers page here: ${dashboardUrl}\nYou can view history, total amount spent, and pending balance.`
    );
    return;
  }

  if (normalized.includes("4") || normalized.includes("report")) {
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

  if (normalized.includes("5") || normalized.includes("profile")) {
    await sendWhatsAppTextMessage(
      sender,
      [
        `Business: ${business.business_name}`,
        `Owner: ${business.owner_name}`,
        `Location: ${business.location_area ?? "Not set"}`,
        `Manage full profile here: ${env.appBaseUrl}/vendor/business-profile`
      ].join("\n")
    );
    return;
  }

  if (normalized.includes("6") || normalized.includes("setting")) {
    await sendWhatsAppTextMessage(
      sender,
      `Open settings here: ${env.appBaseUrl}/vendor/settings`
    );
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

  if (!sender) {
    return NextResponse.json({ received: true });
  }

  if (message?.type === "interactive" && message.interactive?.type === "nfm_reply") {
    await handleFlowCompletion(message, sender);
    return NextResponse.json({ received: true });
  }

  const admin = createSupabaseAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("id, owner_name, business_name, location_area")
    .eq("whatsapp_phone", normalizePhoneNumber(sender))
    .single();

  if (!business) {
    await sendOnboardingFlowOrFallback(sender);
    return NextResponse.json({ received: true });
  }

  await handleVendorCommand(message ?? {}, sender, business);

  return NextResponse.json({ received: true });
}
