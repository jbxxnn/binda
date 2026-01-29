import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import CalendarView from '@/components/calendar/calendar-view';

export default async function AppointmentsPage() {
    const supabase = await createClient();

    // Fetch Staff for filter
    const { data: staffList, error: staffError } = await supabase
        .from('staff')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

    if (staffError) {
        console.error('Error fetching staff:', staffError);
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col space-y-4 max-w-7xl mx-auto py-8">
            <div className="flex items-center justify-between shrink-0">
                <h1 className="text-2xl font-bold">Appointments</h1>
                <Link href="/dashboard/appointments/new">
                    <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground hover:text-primary rounded-full">
                        <Plus className=" h-4 w-4" /> New Booking
                    </Button>
                </Link>
            </div>

            <div className="flex-1 border rounded-md bg-white overflow-hidden shadow-sm">
                <CalendarView staffList={staffList || []} />
            </div>
        </div>
    );
}
