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
    const { 
      category, 
      priority = 'medium', 
      subject, 
      description, 
      rating 
    } = body;

    // Validate required fields
    if (!category || !subject || !description) {
      return NextResponse.json(
        { error: "Category, subject, and description are required" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['bug', 'feature', 'improvement', 'general', 'ui', 'performance', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: "Invalid priority" },
        { status: 400 }
      );
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Get user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Create the feedback record
    const { data: feedbackResult, error: feedbackError } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        business_id: business.id,
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        rating: rating || null,
        status: 'open'
      })
      .select();

    if (feedbackError) {
      console.error('Feedback creation error:', feedbackError);
      return NextResponse.json(
        { error: "Failed to submit feedback", details: feedbackError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback: feedbackResult[0],
      message: "Thank you for your feedback! We'll review it and get back to you soon."
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    // Get user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Get feedback for the business
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      console.error('Feedback fetch error:', feedbackError);
      return NextResponse.json(
        { error: "Failed to fetch feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
