import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { normalizePhoneNumber } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const feedbackSchema = z.object({
  businessId: z.string().uuid(),
  recordedBy: z.string().uuid().nullable().optional(),
  phoneNumber: z.string().min(7),
  message: z.string().min(5).max(1000)
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const input = feedbackSchema.parse(body);
  const supabase = createSupabaseAdminClient();

  if (input.recordedBy) {
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
  }

  const { error } = await supabase.from("vendor_feedback").insert({
    business_id: input.businessId,
    created_by: input.recordedBy ?? null,
    phone_number: normalizePhoneNumber(input.phoneNumber),
    message: input.message.trim()
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Unable to save feedback." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: [
      "*Feedback Received*",
      "",
      "✅ Thank you for your feedback.",
      "",
      "Your message has been saved and the Binda team will review it."
    ].join("\n")
  });
}
