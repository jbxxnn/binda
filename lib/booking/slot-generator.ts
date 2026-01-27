import { createAdminClient } from '@/lib/supabase/admin';
import { DateTime, Interval } from 'luxon';
import { getStaffWorkingHours } from './working-hours';
import { getDayBlocks } from './conflicts';
import { toTenantTime, toUTC } from '@/lib/utils/timezone';

interface Slot {
    start: string; // ISO UTC
    end: string;   // ISO UTC
    available: boolean;
}

/**
 * Generates available time slots for a service on a given date.
 */
export async function generateSlots(
    tenantId: string,
    serviceId: string,
    dateString: string, // YYYY-MM-DD (Tenant Timezone preference)
    timezone: string,   // Tenant Timezone
    staffId?: string    // Optional specific staff
): Promise<Slot[]> {
    const supabase = createAdminClient();

    // 1. Get Service Details (Duration, Buffers)
    const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('duration_minutes, buffer_before_minutes, buffer_after_minutes')
        .eq('id', serviceId)
        .single();

    if (serviceError || !service) {
        throw new Error('Service not found');
    }

    const totalDuration = service.duration_minutes + service.buffer_before_minutes + service.buffer_after_minutes;
    // Note: We might want to return the actual appointment start/end vs the "blocked" time including buffers.
    // For simplicity V1: The slot presented is the START time. The validation checks the full block (buffers included).

    // 2. Identify Staff (Single or All who perform this service)
    let eligibleStaffIds: string[] = [];

    if (staffId) {
        eligibleStaffIds = [staffId];
    } else {
        // Fetch all staff assigned to this service
        const { data: staffMembers } = await supabase
            .from('service_staff')
            .select('staff_id')
            .eq('service_id', serviceId);

        if (staffMembers) {
            eligibleStaffIds = staffMembers.map(s => s.staff_id);
        }
    }

    if (eligibleStaffIds.length === 0) {
        return [];
    }

    // 3. Define the Day Range (in UTC)
    // We need to fetch conflicts for the whole day in tenant time, converted to UTC.
    const queryDate = DateTime.fromISO(dateString, { zone: timezone });
    if (!queryDate.isValid) throw new Error('Invalid date');

    // Start of day in tenant time -> UTC
    const dayStart = queryDate.startOf('day');
    const dayEnd = queryDate.endOf('day');

    // 4. Generate Slots
    // Strategy: 
    // - We'll create a list of "Potential Slots" based on intervals (e.g. 15 or 30 mins)
    // - For each potential slot, we check if ANY eligible staff member is free.
    // - If at least one staff is free -> Slot is Available.

    const SLOT_INTERVAL = 30; // Minutes. Configurable per tenant later?
    const potentialSlots: Slot[] = [];

    let currentCursor = dayStart.set({ hour: 0, minute: 0 }); // Start checking from midnight? Or start of business? 
    // Better: Start from earliest possible working hour across all staff, or just 00:00 to 23:59 and rely on working hours to filter.
    // 00:00 is safer.

    // We loop through the day in SLOT_INTERVAL chunks
    while (currentCursor < dayEnd) {
        const slotStart = currentCursor;
        const slotEnd = currentCursor.plus({ minutes: service.duration_minutes }); // The actual appointment time

        // The "Blocked" time includes buffers. 
        // Usually buffer BEFORE is subtract from start, AFTER is added to end.
        // effectiveStart = slotStart - bufferBefore
        // effectiveEnd = slotEnd + bufferAfter
        const effectiveStart = slotStart.minus({ minutes: service.buffer_before_minutes });
        const effectiveEnd = slotEnd.plus({ minutes: service.buffer_after_minutes });

        // Check if any staff is available for this [effectiveStart, effectiveEnd]
        let isSlotAvailable = false;

        // We can optimize this by fetching all data upfront outside the loop (done in getDayBlocks)
        // But working hours calculation is specific per staff/day.

        // Optimization: Pre-fetch everything.
        // For now, let's just loop. It's robust. 
        // We already have `getDayBlocks` but we need to call it for each staff.

        // To implement `getDayBlocks` properly here we need to map over eligibleStaffIds.
        // Let's do a simplified check for V1 inside this route, but in production we'd optimize the DB calls.

        potentialSlots.push({
            start: slotStart.toUTC().toISO() || '',
            end: slotEnd.toUTC().toISO() || '',
            available: false // Will update below
        });

        currentCursor = currentCursor.plus({ minutes: SLOT_INTERVAL });
    }

    // Now, validate availability for each block
    // This approach above is backwards. It's better to iterate staff -> find their slots -> merge.
    // "Union of Availability"

    const allAvailableSlots = new Set<string>(); // Set of UTC start times

    for (const sId of eligibleStaffIds) {
        // A. Working Hours
        const workingHours = await getStaffWorkingHours(sId, queryDate, timezone, supabase);
        if (!workingHours) continue; // Not working this day

        // B. Conflicts (Appointments & Time Off & Locks)
        const { appointments, timeOff, locks } = await getDayBlocks(sId, dayStart.toUTC().toISO()!, dayEnd.toUTC().toISO()!, supabase);

        // C. Convert conflicts to Intervals
        const blockedIntervals = [
            ...appointments.map(a => Interval.fromDateTimes(DateTime.fromISO(a.start_time), DateTime.fromISO(a.end_time))),
            ...timeOff.map(t => Interval.fromDateTimes(DateTime.fromISO(t.start_datetime), DateTime.fromISO(t.end_datetime))),
            ...locks.map(l => Interval.fromDateTimes(DateTime.fromISO(l.start_time), DateTime.fromISO(l.end_time)))
        ];

        // D. Iterate through day within Working Hours only
        // Align start to SLOT_INTERVAL
        // e.g. Start 09:00. Interval 30.

        let cursor = workingHours.start;
        const shiftEnd = workingHours.end;

        while (cursor.plus({ minutes: totalDuration }) <= shiftEnd) {
            // Define the block required for this service
            // blockStart = cursor - bufferBefore (But can't go before shift start? Usually buffers can bleed into off-time, but let's say NO for now)
            // Actually standard logic: The Appointment itself must be within working hours. Buffers can bleed? 
            // Safest: Entire effective block must be within working hours AND free of conflicts.

            const apptStart = cursor;
            const apptEnd = cursor.plus({ minutes: service.duration_minutes });

            const effectiveStart = apptStart.minus({ minutes: service.buffer_before_minutes });
            const effectiveEnd = apptEnd.plus({ minutes: service.buffer_after_minutes });

            // 1. Integrity Check: Is effective block inside working hours? (Strict mode)
            // If we allow buffers outside, change this.
            if (effectiveStart < workingHours.start || effectiveEnd > workingHours.end) {
                cursor = cursor.plus({ minutes: SLOT_INTERVAL });
                continue;
            }

            // 2. Conflict Check
            const slotInterval = Interval.fromDateTimes(effectiveStart, effectiveEnd);
            const isBlocked = blockedIntervals.some(blocked => blocked.overlaps(slotInterval));

            if (!isBlocked) {
                allAvailableSlots.add(apptStart.toUTC().toISO()!);
            }

            cursor = cursor.plus({ minutes: SLOT_INTERVAL });
        }
    }

    // Sort and return
    const sortedSlots = Array.from(allAvailableSlots).sort().map(startIso => {
        return {
            start: startIso,
            end: DateTime.fromISO(startIso).plus({ minutes: service.duration_minutes }).toUTC().toISO()!,
            available: true
        };
    });

    return sortedSlots;
}
