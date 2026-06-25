import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  candidatePhoneNumbers,
  isValidNigerianPhoneNumber,
  normalizePhoneNumber
} from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashPin } from "@/lib/whatsapp-identity";

const onboardingSchema = z.object({
  userId: z.string().uuid().optional(),
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  whatsappPhone: z.string().min(7),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  accessPin: z.string().regex(/^\d{4}$/).optional(),
  categoryId: z.string().uuid(),
  locationArea: z.string().min(2),
  otherLocationArea: z.string().optional(),
  deliveryAvailable: z.boolean(),
  productsServices: z.string().min(2),
  profileImageUrl: z.string().url().optional()
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const input = onboardingSchema.parse(body);
  const supabase = createSupabaseAdminClient();
  const normalizedWhatsAppPhone = normalizePhoneNumber(input.whatsappPhone);
  let resolvedUserId = input.userId ?? null;
  const resolvedLocationArea =
    input.locationArea === "Other"
      ? String(input.otherLocationArea ?? "").trim()
      : input.locationArea;

  if ((input.email && !input.password) || (!input.email && input.password)) {
    return NextResponse.json(
      { error: "Email and password must be provided together." },
      { status: 400 }
    );
  }

  if (!resolvedLocationArea || resolvedLocationArea.length < 2) {
    return NextResponse.json(
      { error: "Please provide a valid location area." },
      { status: 400 }
    );
  }

  if (!isValidNigerianPhoneNumber(normalizedWhatsAppPhone)) {
    return NextResponse.json(
      { error: "Please provide a valid Nigerian WhatsApp number." },
      { status: 400 }
    );
  }

  if (!resolvedUserId && input.email && input.password) {
    const { data: existingUserList, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json(
        { error: listError.message ?? "Unable to check existing users." },
        { status: 400 }
      );
    }

    const existingUser = existingUserList.users.find(
      (user) => user.email?.toLowerCase() === input.email?.toLowerCase()
    );

    if (existingUser) {
      resolvedUserId = existingUser.id;
    } else {
      const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          full_name: input.ownerName,
          phone_number: normalizedWhatsAppPhone
        }
      });

      if (createUserError || !createdUser.user) {
        return NextResponse.json(
          { error: createUserError?.message ?? "Unable to create user account." },
          { status: 400 }
        );
      }

      resolvedUserId = createdUser.user.id;
    }
  }

  const businessPayload = {
    category_id: input.categoryId,
    business_name: input.businessName,
    owner_name: input.ownerName,
    phone_number: normalizedWhatsAppPhone,
    whatsapp_phone: normalizedWhatsAppPhone,
    location_area: resolvedLocationArea,
    delivery_available: input.deliveryAvailable,
    products_services: input.productsServices,
    profile_image_url: input.profileImageUrl,
    created_by: resolvedUserId
  };

  const existingBusiness = await supabase
    .from("businesses")
    .select("id, business_name")
    .in("whatsapp_phone", candidatePhoneNumbers(input.whatsappPhone))
    .maybeSingle();

  const query = existingBusiness.data
    ? supabase
        .from("businesses")
        .update(businessPayload)
        .eq("id", existingBusiness.data.id)
    : supabase.from("businesses").insert(businessPayload);

  const { data: business, error } = await query
    .select("id, business_name")
    .single();

  if (error || !business) {
    return NextResponse.json({ error: error?.message ?? "Failed to create business" }, { status: 400 });
  }

  if (resolvedUserId) {
    await supabase.from("business_memberships").upsert({
      business_id: business.id,
      user_id: resolvedUserId,
      role: "owner"
    });
  }

  const pinValues = input.accessPin ? hashPin(input.accessPin) : null;

  await supabase.from("whatsapp_auth_identities").upsert({
    business_id: business.id,
    user_id: resolvedUserId,
    phone_number: normalizedWhatsAppPhone,
    pin_salt: pinValues?.salt ?? null,
    pin_hash: pinValues?.hash ?? null,
    last_verified_at: input.accessPin ? new Date().toISOString() : null,
    failed_attempts: 0,
    locked_until: null
  });

  return NextResponse.json({
    success: true,
    business,
    userId: resolvedUserId,
    pinCreated: Boolean(input.accessPin)
  });
}
