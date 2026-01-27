import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasConflict } from '@/lib/booking/conflicts';
import { DateTime } from 'luxon';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { serviceId, staffId, startTime, sessionId } = body; // startTime must be ISO string

        if (!serviceId || !staffId || !startTime || !sessionId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Get Service Duration
        const { data: service } = await supabase
            .from('services')
            .select('duration_minutes, buffer_before_minutes, buffer_after_minutes, tenant_id') // Get tenant_id from service for security
            .eq('id', serviceId)
            .single();

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        // 2. Calculate End Time
        const start = DateTime.fromISO(startTime);
        if (!start.isValid) {
            return NextResponse.json({ error: 'Invalid start time' }, { status: 400 });
        }

        // Lock the actual duration (buffers are for booking validation, but locks should ideally cover buffers too?)
        // Usually locks cover the "consumed" time.
        // Let's safe-guard: Lock start - bufferBefore to end + bufferAfter.

        const effectiveStart = start.minus({ minutes: service.buffer_before_minutes });
        const effectiveEnd = start.plus({ minutes: service.duration_minutes + service.buffer_after_minutes });

        const startIso = effectiveStart.toUTC().toISO();
        const endIso = effectiveEnd.toUTC().toISO();

        if (!startIso || !endIso) {
            return NextResponse.json({ error: 'Date calculation failed' }, { status: 500 });
        }

        // 3. Check for Conflicts (Double check before locking)
        const conflict = await hasConflict(staffId, startIso, endIso);
        if (conflict) {
            return NextResponse.json({ error: 'Slot is no longer available' }, { status: 409 });
        }

        // 4. Create Lock
        // Expires in 10 minutes
        const expiresAt = DateTime.now().plus({ minutes: 10 }).toUTC().toISO();

        const { data: lock, error } = await supabase
            .from('slot_locks')
            .insert({
                tenant_id: service.tenant_id,
                staff_id: staffId,
                service_id: serviceId,
                start_time: startIso,
                end_time: endIso,
                expires_at: expiresAt,
                session_id: sessionId
            })
            .select()
            .single();

        if (error) {
            console.error('Lock creation error:', error);
            return NextResponse.json({ error: 'Failed to lock slot' }, { status: 500 });
        }

        return NextResponse.json(lock);

    } catch (error) {
        console.error('Error in lock API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
