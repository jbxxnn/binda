import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { lockId, sessionId } = body;

        if (!lockId || !sessionId) {
            return NextResponse.json({ error: 'Missing lockId or sessionId' }, { status: 400 });
        }

        // Only allow unlocking if session_id matches (security)
        const { error } = await supabase
            .from('slot_locks')
            .delete()
            .eq('id', lockId)
            .eq('session_id', sessionId); // Ensure user owns the lock

        if (error) {
            console.error('Unlock error:', error);
            return NextResponse.json({ error: 'Failed to release lock' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in unlock API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
