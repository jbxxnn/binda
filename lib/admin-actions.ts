"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function approveBusinessAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const businessId = String(formData.get("business_id") ?? "");
  const nextStatus = String(formData.get("status") ?? "approved");
  const isActive = formData.get("is_active") === "true";

  await supabase
    .from("businesses")
    .update({
      status: nextStatus,
      is_verified: nextStatus === "approved",
      is_active: isActive
    })
    .eq("id", businessId);

  revalidatePath("/admin");
  revalidatePath("/admin/businesses");
}

export async function createEnquiryAction(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const categoryId = String(formData.get("category_id") ?? "");
  const locationArea = String(formData.get("location_area") ?? "");
  const requestedItem = String(formData.get("requested_item") ?? "");
  const details = String(formData.get("details") ?? "") || null;

  const { data: matchingBusinesses } = await supabase
    .from("businesses")
    .select("id, products_services, location_area, category_id")
    .eq("status", "approved")
    .eq("is_active", true)
    .eq("category_id", categoryId);

  const normalizedItem = requestedItem.toLowerCase();
  const matchedBusinessIds = (matchingBusinesses ?? [])
    .filter((business) => {
      const locationMatch = business.location_area.toLowerCase().includes(locationArea.toLowerCase());
      const productMatch = business.products_services.toLowerCase().includes(normalizedItem);
      return locationMatch || productMatch;
    })
    .map((business) => business.id);

  await supabase.from("enquiries").insert({
    category_id: categoryId,
    customer_name: String(formData.get("customer_name") ?? "") || null,
    customer_phone: String(formData.get("customer_phone") ?? "") || null,
    location_area: locationArea,
    requested_item: requestedItem,
    details,
    status: matchedBusinessIds.length > 0 ? "matched" : "new",
    matched_business_ids: matchedBusinessIds
  });

  revalidatePath("/admin/enquiries");
}
