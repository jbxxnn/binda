import { createAdminClient } from '@/lib/supabase/admin';
import { SmartWatch04Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Clock } from 'lucide-react';

interface TenantStatusProps {
    tenantId: string;
    timezone: string;
}

export default async function TenantStatus({ tenantId, timezone }: TenantStatusProps) {
    const supabase = createAdminClient();

    // 1. Get all staff for this tenant
    const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

    if (staffError || !staffData || staffData.length === 0) {
        return null;
    }

    const staffIds = staffData.map(s => s.id);

    // 2. Get working hours for these staff
    const { data: hoursData, error: hoursError } = await supabase
        .from('staff_working_hours')
        .select('day_of_week, start_time, end_time')
        .in('staff_id', staffIds)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

    if (hoursError || !hoursData || hoursData.length === 0) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span>Closed</span>
            </div>
        );
    }

    // 3. Determine Status
    // Get current time in tenant's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        weekday: 'short' // Sun, Mon, etc.
    });

    const parts = formatter.formatToParts(new Date());
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    const second = parts.find(p => p.type === 'second')?.value || '00';
    const currentTime = `${hour}:${minute}:${second}`;

    // Map weekday string to 0-6 (Sun-Sat) because Intl returns string
    const weekdayStr = parts.find(p => p.type === 'weekday')?.value; // "Tue"
    const daysMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    // Fallback: use getDay() on a zoned date object if we used a library, 
    // but without one we rely on the specific format. 
    // Actually, simpler: Use string Date with timezone for creating a Date object? No.
    // Reliable way without library:
    // Create date string with timezone offset?
    // Let's trust the database day_of_week corresponds to standard JS 0(Sun)-6(Sat).
    // And use new Date().toLocaleString("en-US", {timeZone: timezone}) to parse.

    // Better way to get current day index in timezone:
    const now = new Date();
    const zonedDateString = now.toLocaleString("en-US", { timeZone: timezone });
    const zonedDate = new Date(zonedDateString);
    const currentDay = zonedDate.getDay();

    // Find any open shift RIGHT NOW
    // Logic: day_of_week == currentDay AND start_time <= currentTime <= end_time
    const openShifts = hoursData.filter(h =>
        h.day_of_week === currentDay &&
        h.start_time <= currentTime &&
        h.end_time > currentTime
    );

    let statusText = '';
    let isOpen = false;

    if (openShifts.length > 0) {
        isOpen = true;
        // Find latest closing time today
        const maxEndTime = openShifts.reduce((max, h) => h.end_time > max ? h.end_time : max, '');
        // Format maxEndTime (HH:mm:ss) to friendly time
        const [h, m] = maxEndTime.split(':');
        const formattedTime = new Date(0, 0, 0, parseInt(h), parseInt(m)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        statusText = `Open • Closes ${formattedTime}`;
    } else {
        isOpen = false;
        // Find NEXT opening time
        // 1. Later today?
        const laterToday = hoursData.filter(h =>
            h.day_of_week === currentDay &&
            h.start_time > currentTime
        );

        let nextShift = null;
        let dayDiff = 0;

        if (laterToday.length > 0) {
            nextShift = laterToday[0]; // Already sorted by start_time
        } else {
            // 2. Future days
            for (let i = 1; i <= 7; i++) {
                const checkDay = (currentDay + i) % 7;
                const shifts = hoursData.filter(h => h.day_of_week === checkDay);
                if (shifts.length > 0) {
                    nextShift = shifts[0]; // Sorted by start_time
                    dayDiff = i;
                    break;
                }
            }
        }

        if (nextShift) {
            const [h, m] = nextShift.start_time.split(':');
            const formattedTime = new Date(0, 0, 0, parseInt(h), parseInt(m)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

            if (dayDiff === 0) {
                statusText = `Closed • Opens today at ${formattedTime}`;
            } else if (dayDiff === 1) {
                statusText = `Closed • Opens tomorrow at ${formattedTime}`;
            } else {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                statusText = `Closed • Opens ${days[nextShift.day_of_week]} at ${formattedTime}`;
            }
        } else {
            statusText = 'Closed';
        }
    }

    return (
        <div className={`flex items-center gap-1 text-sm font-medium ${isOpen ? 'text-green-700' : 'text-slate-500'}`}>
            <HugeiconsIcon icon={SmartWatch04Icon} size={12} />
            <span>{statusText}</span>
        </div>
    );
}
