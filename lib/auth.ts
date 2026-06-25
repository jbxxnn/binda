import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";

export async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone_number")
    .eq("id", user.id)
    .single();

  return {
    user,
    profile
  };
}

export async function requireRole(role: AppRole) {
  const result = await getCurrentUserProfile();

  if (!result?.profile) {
    redirect("/login");
  }

  if (result.profile.role !== role && result.profile.role !== "admin") {
    redirect(role === "admin" ? "/vendor" : "/admin");
  }

  return result;
}
