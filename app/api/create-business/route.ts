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
    const { businessInfo, userPreferences, accountingSettings } = body;

    // Validate required fields
    if (!businessInfo?.name || !businessInfo?.slug) {
      return NextResponse.json(
        { error: "Business name and slug are required" },
        { status: 400 }
      );
    }

    // Check if user already has a business
    const { data: existingUserBusiness } = await supabase
      .from('businesses')
      .select('id, slug')
      .eq('owner_id', user.id)
      .single();

    // Check if business slug already exists (excluding current user's business if updating)
    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('slug')
      .eq('slug', businessInfo.slug)
      .neq('owner_id', user.id) // Exclude current user's business
      .single();

    if (existingBusiness) {
      return NextResponse.json(
        { error: "This business URL is already taken. Please choose a different one." },
        { status: 400 }
      );
    }

    // If user already has a business, we'll update it instead of creating a new one
    // This allows for re-onboarding or updating business settings

    // Create or update the business record
    let business;
    
    if (existingUserBusiness) {
      // Update existing business
      const { data: businessResult, error: businessError } = await supabase
        .from('businesses')
        .update({
          name: businessInfo.name.trim(),
          slug: businessInfo.slug.trim(),
          settings: {
            business_type: businessInfo.type || '',
            description: businessInfo.description || '',
            currency: userPreferences?.currency || 'USD',
            timezone: userPreferences?.timezone || 'UTC',
            date_format: userPreferences?.dateFormat || 'MM/DD/YYYY',
            invoice_prefix: accountingSettings?.invoicePrefix || 'INV'
          }
        })
        .eq('id', existingUserBusiness.id)
        .select();

      if (businessError) {
        console.error('Business update error:', businessError);
        return NextResponse.json(
          { error: "Failed to update business", details: businessError.message },
          { status: 500 }
        );
      }

      business = businessResult[0];
    } else {
      // Create new business
      const { data: businessResult, error: businessError } = await supabase
        .from('businesses')
        .insert({
          name: businessInfo.name.trim(),
          slug: businessInfo.slug.trim(),
          owner_id: user.id,
          subscription_plan: 'free',
          subscription_status: 'active',
          settings: {
            business_type: businessInfo.type || '',
            description: businessInfo.description || '',
            currency: userPreferences?.currency || 'USD',
            timezone: userPreferences?.timezone || 'UTC',
            date_format: userPreferences?.dateFormat || 'MM/DD/YYYY',
            invoice_prefix: accountingSettings?.invoicePrefix || 'INV'
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

      business = businessResult[0];
    }

    // Create user preferences
    if (userPreferences) {
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferences: {
            notifications: userPreferences.notifications || {
              email: true,
              push: true,
              sms: false
            },
            timezone: userPreferences.timezone || 'UTC',
            currency: userPreferences.currency || 'USD',
            date_format: userPreferences.dateFormat || 'MM/DD/YYYY'
          }
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (preferencesError) {
        console.error('Preferences creation error:', preferencesError);
        // Don't fail the entire request for preferences error
      }
    }

    // Create or update accounting settings
    if (accountingSettings) {
      const { error: accountingError } = await supabase
        .from('accounting_settings')
        .upsert({
          business_id: business.id,
          fiscal_year_start: '2024-01-01',
          default_currency: userPreferences?.currency || 'USD',
          tax_rate: accountingSettings.taxRate || 0,
          invoice_prefix: accountingSettings.invoicePrefix || 'INV',
          invoice_numbering: accountingSettings.invoiceNumbering || 'sequential',
          invoice_start_number: 1,
          quote_prefix: 'QUO',
          quote_numbering: 'sequential',
          quote_start_number: 1,
          payment_terms_days: accountingSettings.paymentTerms || 30,
          late_fee_rate: 0,
          late_fee_type: 'percentage',
          auto_send_reminders: false,
          reminder_days_before_due: 7,
          reminder_days_after_due: 3
        }, {
          onConflict: 'business_id',
          ignoreDuplicates: false
        });

      if (accountingError) {
        console.error('Accounting settings upsert error:', accountingError);
        // Don't fail the entire request for accounting settings error
      }
    }

    return NextResponse.json({
      success: true,
      business: business
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

