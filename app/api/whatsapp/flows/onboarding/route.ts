import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const onboardingSchema = z.object({
  userId: z.string().uuid().optional(),
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  whatsappPhone: z.string().min(7),
  categoryId: z.string().uuid(),
  locationArea: z.string().min(2),
  deliveryAvailable: z.boolean(),
  productsServices: z.string().min(2),
  profileImageUrl: z.string().url().optional()
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const input = onboardingSchema.parse(body);
  const supabase = createSupabaseAdminClient();

  const businessPayload = {
    category_id: input.categoryId,
    business_name: input.businessName,
    owner_name: input.ownerName,
    phone_number: input.whatsappPhone,
    whatsapp_phone: input.whatsappPhone,
    location_area: input.locationArea,
    delivery_available: input.deliveryAvailable,
    products_services: input.productsServices,
    profile_image_url: input.profileImageUrl,
    created_by: input.userId ?? null
  };

  const existingBusiness = await supabase
    .from("businesses")
    .select("id, business_name")
    .eq("whatsapp_phone", input.whatsappPhone)
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

  if (input.userId) {
    await supabase.from("business_memberships").upsert({
      business_id: business.id,
      user_id: input.userId,
      role: "owner"
    });
  }

  return NextResponse.json({
    success: true,
    business
  });
}
