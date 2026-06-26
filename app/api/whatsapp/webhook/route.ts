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
    list_reply?: { id?: string; title?: string };
  };
};

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
    flowToken: buildFlowToken("record_sale", [business.id, recordedBy])
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
      whatsappPhone: String(response.whatsappPhone ?? normalizePhoneNumber(sender)),
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
      deliveryAvailable: parseBooleanLike(response.deliveryAvailable),
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
        ? `Your business setup for ${data.business.business_name} has been saved and your account is ready.${data.pinCreated ? " Your WhatsApp PIN is active." : " Reply SET PIN 1234 to protect your records."} You can also sign in at ${env.appBaseUrl}/login`
        : `Your business setup for ${data.business.business_name} has been saved.${data.pinCreated ? " Your WhatsApp PIN is active." : " Reply SET PIN 1234 to protect your records."}`
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
        unitPrice: Number(response.unitPrice ?? response.amount ?? 0)
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

    if (saleResponse.ok) {
      await sendWhatsAppTextMessage(
        sender,
        [
          "What would you like to do next?",
          "1 or Record Sale",
          "4 or Reports",
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
