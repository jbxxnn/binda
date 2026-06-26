import crypto from "node:crypto";

import { env } from "@/lib/env";

type FlowType = "onboarding" | "record_sale" | "add_product" | "update_product";

type FlowSendOptions = {
  body: string;
  cta: string;
  flowId: string;
  flowToken: string;
  screen?: string;
  data?: Record<string, string | number | boolean | null>;
};

type ListRow = {
  id: string;
  title: string;
  description?: string;
};

type ListSection = {
  title: string;
  rows: ListRow[];
};

export function verifyWhatsAppSignature(payload: string, signatureHeader: string | null) {
  if (!env.whatsappAppSecret) {
    return false;
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", env.whatsappAppSecret)
    .update(payload)
    .digest("hex");

  const provided = signatureHeader.replace("sha256=", "");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0
  }).format(amount);
}

async function sendWhatsAppMessage(payload: Record<string, unknown>) {
  if (!env.whatsappAccessToken || !env.whatsappPhoneNumberId) {
    return { ok: false, reason: "WhatsApp credentials missing" };
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${env.whatsappPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsappAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  return {
    ok: response.ok,
    status: response.status,
    data: await response.json().catch(() => null)
  };
}

export async function sendWhatsAppTextMessage(to: string, body: string) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body }
  });
}

export async function sendWhatsAppTypingIndicator(messageId: string) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
    typing_indicator: {
      type: "text"
    }
  });
}

export async function sendWhatsAppFlowMessage(to: string, options: FlowSendOptions) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "flow",
      body: {
        text: options.body
      },
      action: {
        name: "flow",
        parameters: {
          flow_message_version: env.whatsappFlowMessageVersion,
          flow_id: options.flowId,
          flow_token: options.flowToken,
          flow_cta: options.cta,
          flow_action: options.screen ? "navigate" : "data_exchange",
          ...(options.screen
            ? {
                flow_action_payload: {
                  screen: options.screen,
                  data: options.data ?? {}
                }
              }
            : {})
        }
      }
    }
  });
}

export async function sendWhatsAppListMessage(to: string, options: {
  header?: string;
  body: string;
  footer?: string;
  button: string;
  sections: ListSection[];
}) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      ...(options.header
        ? {
            header: {
              type: "text",
              text: options.header
            }
          }
        : {}),
      body: {
        text: options.body
      },
      ...(options.footer
        ? {
            footer: {
              text: options.footer
            }
          }
        : {}),
      action: {
        button: options.button,
        sections: options.sections
      }
    }
  });
}

export async function sendWhatsAppReplyButtonsMessage(to: string, options: {
  body: string;
  buttons: Array<{
    id: string;
    title: string;
  }>;
}) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: options.body
      },
      action: {
        buttons: options.buttons.slice(0, 3).map((button) => ({
          type: "reply",
          reply: {
            id: button.id,
            title: button.title
          }
        }))
      }
    }
  });
}

export function getConfiguredFlowId(flowType: FlowType) {
  if (flowType === "onboarding") {
    return env.whatsappOnboardingFlowId ?? null;
  }

  if (flowType === "add_product") {
    return env.whatsappAddProductFlowId ?? null;
  }

  if (flowType === "update_product") {
    return env.whatsappUpdateProductFlowId ?? null;
  }

  return env.whatsappRecordSaleFlowId ?? null;
}

export function buildFlowToken(prefix: FlowType, values: string[]) {
  return [prefix, ...values].join(":");
}

export function parseFlowResponseJson(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function normalizeIncomingWhatsAppText(message: Record<string, unknown> | undefined) {
  if (!message) {
    return "";
  }

  const textBody =
    typeof message.text === "object" && message.text !== null && "body" in message.text
      ? String((message.text as { body?: string }).body ?? "")
      : "";

  const buttonReply =
    typeof message.interactive === "object" &&
    message.interactive !== null &&
    "button_reply" in message.interactive
      ? (message.interactive as { button_reply?: { title?: string; id?: string } }).button_reply
      : null;

  const listReply =
    typeof message.interactive === "object" &&
    message.interactive !== null &&
    "list_reply" in message.interactive
      ? (message.interactive as { list_reply?: { title?: string; id?: string } }).list_reply
      : null;

  return [textBody, buttonReply?.id, buttonReply?.title, listReply?.id, listReply?.title]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase();
}
