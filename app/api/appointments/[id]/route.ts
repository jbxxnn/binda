import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { use } from 'react';

// Next.js 15+ Params type handling
// The handlers receive params as a Promise in newer Next.js versions if strict modes are on, 
// but currently standard is { params: { id: string } }
// To be safe with the new types:
type Params = Promise<{ id: string }>;

export async function GET(
    request: NextRequest,
    { params }: { params: Params } // Match Next.js 15 signature
) {
    const { id } = await params;

    try {
        const supabase = await createClient();

        const { data: appointment, error } = await supabase
            .from('appointments')
            .select(`
            *,
            customer:customers(*),
            service:services(*),
            staff:staff(*)
        `)
            .eq('id', id)
            .single();

        if (error || !appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        return NextResponse.json(appointment);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Params }
) {
    const { id } = await params;

    try {
        const supabase = await createClient();

        // Soft delete or status change? Usually specific status 'cancelled'
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
