import { NextRequest, NextResponse } from "next/server";

import { getVendorReport } from "@/lib/reports";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const filter = request.nextUrl.searchParams.get("filter") ?? "today";
  const supabase = await createSupabaseServerClient();
  const report = await getVendorReport(
    businessId,
    filter,
    supabase,
    request.nextUrl.searchParams.get("start"),
    request.nextUrl.searchParams.get("end")
  );

  return NextResponse.json(report);
}
