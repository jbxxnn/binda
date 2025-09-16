import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { businessName, businessSlug } = body;

    if (!businessName || !businessSlug) {
      return NextResponse.json(
        { error: "Business name and slug are required" },
        { status: 400 }
      );
    }

    // Check if business slug already exists
    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('slug')
      .eq('slug', businessSlug)
      .single();

    if (existingBusiness) {
      return NextResponse.json(
        { error: "This business URL is already taken. Please choose a different one." },
        { status: 400 }
      );
    }

    // Check if user already has a business
    const { data: existingUserBusiness } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (existingUserBusiness) {
      return NextResponse.json(
        { error: "You already have a business account" },
        { status: 400 }
      );
    }

    // Create the business record
    const { data: businessResult, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: businessName.trim(),
        slug: businessSlug.trim(),
        owner_id: user.id,
        subscription_plan: 'free',
        subscription_status: 'active',
        settings: {
          currency: 'USD',
          timezone: 'UTC',
          invoice_prefix: 'INV'
        }
      })
      .select();

    if (businessError) {
      console.error('Business creation error:', businessError);
      return NextResponse.json(
        { error: "Failed to create business", details: businessError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      business: businessResult[0]
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

