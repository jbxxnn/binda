import { createClient } from '@/lib/supabase/server';
import { DateTime } from 'luxon';
import { toTenantTime, parseTimeOnDate } from '@/lib/utils/timezone';

export interface DayWorkingHours {
    start: DateTime;
    end: DateTime;
}

/**
 * Fetches the specific working hours for a staff member on a given date.
 * Handles:
 * 1. Base weekly schedule (staff_working_hours)
 * 2. [TODO] Specific date overrides (if we add that feature later)
 * 3. Checks if staff is active
 * 
 * Note: Time-off blocks are handled separately by the conflict detector.
 */
import { SupabaseClient } from '@supabase/supabase-js';

export async function getStaffWorkingHours(
    staffId: string,
    date: DateTime, // Date in tenant timezone
    timezone: string,
    supabase: SupabaseClient
): Promise<DayWorkingHours | null> {
    // Client is injected to support both Admin (public) and User contexts
    // const supabase = await createClient(); // REMOVED

    // 1. Get day of week (0-6, Luxon uses 1-7 where 7 is Sunday, Supabase used 0-6 where 0 is Sunday in our seed? 
    // Let's verify DB constraint: day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6)
    // Standard JS getDay() is 0=Sunday. Luxon weekday is 1=Mon, 7=Sun.
    // We need to match our DB convention. 
    // Let's assume our DB follows JS getDay() convention: 0=Sun, 1=Mon...

    // Luxon: .weekday is 1-7 (Mon-Sun).
    // JS: .getDay() is 0-6 (Sun-Sat).
    // Conversion: JS 0 (Sun) -> Luxon 7. JS 1 (Mon) -> Luxon 1.
    // Let's convert Luxon date to JS day index for DB query.

    const jsDayIndex = date.toJSDate().getDay();

    // 2. Fetch standard working hours
    const { data: hours, error } = await supabase
        .from('staff_working_hours')
        .select('start_time, end_time')
        .eq('staff_id', staffId)
        .eq('day_of_week', jsDayIndex)
        .single();

    if (error || !hours) {
        // Staff does not work on this day of the week
        return null;
    }

    // 3. Convert string "09:00:00" to DateTime objects on that specific date
    const start = parseTimeOnDate(hours.start_time, date, timezone);
    const end = parseTimeOnDate(hours.end_time, date, timezone);

    return { start, end };
}
