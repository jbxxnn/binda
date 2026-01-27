import CalendarView from '@/components/calendar/calendar-view';
import { createClient } from '@/lib/supabase/server';

export default async function CalendarPage() {
    // We can fetch initial staff list server side to pass to filters
    const supabase = await createClient();
    const { data: staff } = await supabase.from('staff').select('id, name').eq('is_active', true);

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Calendar</h1>
            </div>

            <div className="flex-1 border rounded-lg bg-white shadow-sm overflow-hidden">
                <CalendarView staffList={staff || []} />
            </div>
        </div>
    );
}
