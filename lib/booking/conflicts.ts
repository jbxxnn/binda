import { createClient } from '@/lib/supabase/server';
import { DateTime } from 'luxon';

/**
 * Checks if a specific time range is free for a staff member.
 * Checks against:
 * 1. Existing Appointments
 * 2. Time Off blocks
 * 3. [TODO] Slot Locks (Checked separately usually, but could be here)
 * 
 * @param start UTC ISO string
 * @param end UTC ISO string
 */
export async function hasConflict(
    staffId: string,
    start: string,
    end: string
): Promise<boolean> {
    const supabase = await createClient();

    // 1. Check Appointments
    // "Find any appointment that overlaps with [start, end)"
    // Overlap logic: (Appt.Start < Request.End) AND (Appt.End > Request.Start)
    const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('id')
        .eq('staff_id', staffId)
        .neq('status', 'cancelled') // Ignore cancelled
        .lt('start_time', end)
        .gt('end_time', start)
        .limit(1);

    if (apptError) {
        console.error('Error checking appointment conflicts:', apptError);
        throw new Error('Failed to check conflicts');
    }

    if (appointments && appointments.length > 0) {
        return true; // Conflict found
    }

    // 2. Check Time Off
    // Similar overlap logic
    const { data: timeOff, error: timeOffError } = await supabase
        .from('staff_time_off')
        .select('id')
        .eq('staff_id', staffId)
        .lt('start_time', end)
        .gt('end_time', start)
        .limit(1);

    if (timeOffError) {
        console.error('Error checking time-off conflicts:', timeOffError);
        throw new Error('Failed to check conflicts');
    }

    if (timeOff && timeOff.length > 0) {
        return true;
    }

    // 3. Check Slot Locks (Active locks only)
    const { data: locks, error: locksError } = await supabase
        .from('slot_locks')
        .select('id')
        .eq('staff_id', staffId)
        .gt('expires_at', new Date().toISOString()) // Only unexpired locks
        .lt('start_time', end)
        .gt('end_time', start)
        .limit(1);

    if (locksError) {
        console.error('Error checking slot lock conflicts:', locksError);
        throw new Error('Failed to check conflicts');
    }

    if (locks && locks.length > 0) {
        return true;
    }

    return false;
}

/**
 * Bulk check for multiple slots at once to minimize DB calls?
 * For now, we'll keep it simple: simpler queries are cached better by Postgres.
 * But for a full day generation, strictly iterating might be N+1.
 * 
 * Better approach for "Generate Slots": 
 * Fetch ALL appointments for the day once, then perform in-memory checks.
 */
import { SupabaseClient } from '@supabase/supabase-js';

// ... (keep hasConflict imports if needed, but adding SupabaseClient import at top)

export async function getDayBlocks(
    staffId: string,
    dayStart: string, // UTC
    dayEnd: string,   // UTC
    supabase: SupabaseClient
) {
    // const supabase = await createClient(); // REMOVED

    const { data: appointments } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('staff_id', staffId)
        .neq('status', 'cancelled')
        .gte('end_time', dayStart)
        .lte('start_time', dayEnd);

    const { data: timeOff } = await supabase
        .from('staff_time_off')
        .select('start_time, end_time')
        .eq('staff_id', staffId)
        .gte('end_time', dayStart)
        .lte('start_time', dayEnd);

    // Ensure slot locks are fetched (Re-applying to be safe)
    const { data: locks } = await supabase
        .from('slot_locks')
        .select('start_time, end_time')
        .eq('staff_id', staffId)
        .gt('expires_at', new Date().toISOString())
        .gte('end_time', dayStart)
        .lte('start_time', dayEnd);

    return {
        appointments: appointments || [],
        timeOff: timeOff || [],
        locks: locks || []
    };
}
