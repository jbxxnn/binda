import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/preferences - Get user preferences
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // Return preferences or default if none exist
    const preferences = data?.preferences || {
      notifications: {
        email: true,
        push: true,
        sms: false
      },
      timezone: 'America/New_York',
      currency: 'USD',
      date_format: 'MM/DD/YYYY'
    };

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error in GET /api/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/preferences - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: 'Invalid preferences data' }, { status: 400 });
    }

    // Validate preferences structure
    const validPreferences = {
      notifications: {
        email: Boolean(preferences.notifications?.email ?? true),
        push: Boolean(preferences.notifications?.push ?? true),
        sms: Boolean(preferences.notifications?.sms ?? false)
      },
      timezone: String(preferences.timezone || 'America/New_York'),
      currency: String(preferences.currency || 'USD'),
      date_format: String(preferences.date_format || 'MM/DD/YYYY')
    };

    // Upsert preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        preferences: validPreferences
      }, {
        onConflict: 'user_id'
      })
      .select('preferences')
      .single();

    if (error) {
      console.error('Database error updating preferences:', error);
      return NextResponse.json({ error: 'Failed to update preferences', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      preferences: data.preferences 
    });
  } catch (error) {
    console.error('Error in PUT /api/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
