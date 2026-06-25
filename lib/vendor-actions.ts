"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActiveBusiness = {
  id: string;
  business_name: string;
  owner_name: string;
  phone_number: string;
  whatsapp_phone: string;
  location_area: string;
  delivery_available: boolean;
  products_services: string;
  status: string;
};

export async function requireActiveBusiness(): Promise<ActiveBusiness> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("business_memberships")
    .select(
      "businesses(id, business_name, owner_name, phone_number, whatsapp_phone, location_area, delivery_available, products_services, status)"
    )
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const business = Array.isArray(memberships?.businesses)
    ? memberships.businesses[0]
    : memberships?.businesses;

  if (!business) {
    redirect("/vendor");
  }

  return business as ActiveBusiness;
}

export async function createProductAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const business = await requireActiveBusiness();

  await supabase.from("products").insert({
    business_id: business.id,
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? "") || null,
    unit_price: Number(formData.get("unit_price") ?? 0),
    is_active: formData.get("is_active") === "on"
  });

  revalidatePath("/vendor/products");
  revalidatePath("/vendor");
}

export async function toggleProductAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const productId = String(formData.get("product_id") ?? "");
  const nextState = formData.get("next_state") === "true";

  await supabase.from("products").update({ is_active: nextState }).eq("id", productId);

  revalidatePath("/vendor/products");
}

export async function createCustomerAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const business = await requireActiveBusiness();

  await supabase.from("customers").insert({
    business_id: business.id,
    full_name: String(formData.get("full_name") ?? ""),
    phone_number: String(formData.get("phone_number") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    address_text: String(formData.get("address_text") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null
  });

  revalidatePath("/vendor/customers");
}

export async function updateBusinessProfileAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const business = await requireActiveBusiness();

  await supabase
    .from("businesses")
    .update({
      business_name: String(formData.get("business_name") ?? ""),
      owner_name: String(formData.get("owner_name") ?? ""),
      phone_number: String(formData.get("phone_number") ?? ""),
      whatsapp_phone: String(formData.get("whatsapp_phone") ?? ""),
      location_area: String(formData.get("location_area") ?? ""),
      delivery_available: formData.get("delivery_available") === "on",
      products_services: String(formData.get("products_services") ?? "")
    })
    .eq("id", business.id);

  revalidatePath("/vendor/business-profile");
  revalidatePath("/vendor");
}

export async function recordSaleAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const business = await requireActiveBusiness();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const quantity = Number(formData.get("quantity") ?? 1);
  const unitPrice = Number(formData.get("unit_price") ?? 0);
  const total = quantity * unitPrice;
  const amountPaid = Number(formData.get("amount_paid") ?? 0);
  const productId = String(formData.get("product_id") ?? "") || null;
  const customerId = String(formData.get("customer_id") ?? "") || null;
  const itemName = String(formData.get("item_name") ?? "");
  const paymentStatus = String(formData.get("payment_status") ?? "paid");
  const paymentMethod = String(formData.get("payment_method") ?? "cash");

  const { data: transaction } = await supabase
    .from("transactions")
    .insert({
      business_id: business.id,
      customer_id: customerId || null,
      recorded_by: user.id,
      subtotal_amount: total,
      total_amount: total,
      amount_paid: amountPaid,
      amount_pending: Math.max(total - amountPaid, 0),
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      notes: String(formData.get("notes") ?? "") || null
    })
    .select("id")
    .single();

  if (transaction) {
    await supabase.from("transaction_items").insert({
      transaction_id: transaction.id,
      product_id: productId || null,
      item_name: itemName,
      quantity,
      unit_price: unitPrice,
      line_total: total
    });

    if (amountPaid > 0) {
      await supabase.from("payments").insert({
        transaction_id: transaction.id,
        business_id: business.id,
        customer_id: customerId || null,
        amount: amountPaid,
        payment_method: paymentMethod,
        recorded_by: user.id
      });
    }
  }

  revalidatePath("/vendor");
  revalidatePath("/vendor/record-sale");
  revalidatePath("/vendor/customers");
  redirect("/vendor/record-sale?success=1");
}
