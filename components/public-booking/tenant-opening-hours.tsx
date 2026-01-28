import { createAdminClient } from '@/lib/supabase/admin';

interface TenantOpeningHoursProps {
    tenantId: string;
}

export default async function TenantOpeningHours({ tenantId }: TenantOpeningHoursProps) {
    const supabase = createAdminClient();

    // 1. Get all staff for this tenant
    const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

    if (!staffData || staffData.length === 0) {
        return null;
    }

    const staffIds = staffData.map(s => s.id);

    // 2. Get working hours for these staff
    const { data: hoursData } = await supabase
        .from('staff_working_hours')
        .select('day_of_week, start_time, end_time')
        .in('staff_id', staffIds);

    if (!hoursData) {
        return null;
    }

    // 3. Aggregate hours per day
    // Days: 0 (Sun) - 6 (Sat). We want to display Mon (1) - Sun (0).
    const daysOrder = [1, 2, 3, 4, 5, 6, 0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const weeklySchedule = daysOrder.map(dayIndex => {
        const dayShifts = hoursData.filter(h => h.day_of_week === dayIndex);

        if (dayShifts.length === 0) {
            return {
                day: dayNames[dayIndex],
                isOpen: false,
                hours: 'Closed'
            };
        }

        // Find earliest start and latest end
        const startTime = dayShifts.reduce((min, h) => h.start_time < min ? h.start_time : min, '23:59:59');
        const endTime = dayShifts.reduce((max, h) => h.end_time > max ? h.end_time : max, '00:00:00');

        // Format times (HH:mm)
        const formatTime = (timeStr: string) => {
            const [h, m] = timeStr.split(':');
            return `${h}:${m}`;
        };

        return {
            day: dayNames[dayIndex],
            isOpen: true,
            hours: `${formatTime(startTime)} - ${formatTime(endTime)}`
        };
    });

    return (
        <div>
            <h3 className="text-lg font-semibold mb-2">Opening times</h3>
            <div className="space-y-3">
                {weeklySchedule.map((schedule, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${schedule.isOpen ? 'bg-[#75E066]' : 'bg-slate-300'}`} />
                            <span className={`${schedule.isOpen ? 'text-slate-900' : 'text-slate-500 font-medium'}`}>
                                {schedule.day}
                            </span>
                        </div>
                        <span className={`${schedule.isOpen ? 'text-slate-900' : 'text-slate-500 font-medium'}`}>
                            {schedule.hours}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
