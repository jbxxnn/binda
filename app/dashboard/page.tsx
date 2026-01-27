import { createClient } from '@/lib/supabase/server';
import StatsCards from '@/components/dashboard/stats-cards';
import { AnalyticsChart } from '@/components/dashboard/analytics-chart';
import TodaysAppointments from '@/components/dashboard/todays-appointments';
import { DateTime } from 'luxon';

export default async function DashboardPage() {
    const supabase = await createClient();

    // Determine "Today" range in UTC based on generic timezone (or hardcoded for now)
    // IMPORTANT: In production, use tenant timezone.
    const now = DateTime.now(); // Server time (UTC usually)
    const startOfDay = now.startOf('day').toUTC().toISO();
    const endOfDay = now.endOf('day').toUTC().toISO();
    const startOfYear = now.startOf('year').toUTC().toISO();
    const endOfYear = now.endOf('year').toUTC().toISO();

    // 1. Fetch Today's Appointments
    // 1. Fetch Today's Appointments & Historical Data
    const [todaysAppointmentsRes, historicalAppointmentsRes] = await Promise.all([
        supabase
            .from('appointments')
            .select(`
                id, start_time, end_time, status,
                customer:customers(name, email),
                service:services(name, price),
                staff:staff(name)
            `)
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)
            .order('start_time', { ascending: true }),
        supabase
            .from('appointments')
            .select(`
                start_time, status,
                service:services(price)
            `)
            .gte('start_time', startOfYear)
            .lte('start_time', endOfYear)
            .in('status', ['completed', 'confirmed']) // Include confirmed for projections
    ]);

    const appointments = todaysAppointmentsRes.data;
    const historicalAppointments = historicalAppointmentsRes.data || [];

    const todaysList = (appointments || []).map((appt: any) => ({
        ...appt,
        customer: Array.isArray(appt.customer) ? appt.customer[0] : appt.customer,
        service: Array.isArray(appt.service) ? appt.service[0] : appt.service,
        staff: Array.isArray(appt.staff) ? appt.staff[0] : appt.staff,
    }));

    // 2. Calculate Stats
    const totalAppointments = todaysList.length;
    const completedAppointments = todaysList.filter(a => a.status === 'completed').length; // Or 'confirmed' if past time

    // Revenue: Sum of service price (simplified) for confirmed/completed
    const revenue = todaysList
        .filter(a => a.status !== 'cancelled')
        .reduce((sum, appt) => {
            const price = Array.isArray(appt.service) ? appt.service[0]?.price : appt.service?.price;
            return sum + (price || 0);
        }, 0);

    // 3. Active Staff (Count distinct staff with appointments today)
    // Or fetch 'is_active' staff from DB
    const { count: activeStaffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

    // 4. Aggregate Historical Data for Chart
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1; // 1-12
        const monthName = DateTime.local(now.year, monthNum).toFormat('MMM');

        const monthlyTotal = historicalAppointments
            .filter((appt: any) => {
                const apptDate = DateTime.fromISO(appt.start_time);
                return apptDate.month === monthNum;
            })
            .reduce((sum: number, appt: any) => {
                const service = Array.isArray(appt.service) ? appt.service[0] : appt.service;
                return sum + (service?.price || 0);
            }, 0);

        return { name: monthName, total: monthlyTotal };
    });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            {/* <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div> */}

            <StatsCards
                totalAppointments={totalAppointments}
                completedAppointments={completedAppointments}
                activeStaff={activeStaffCount || 0}
                revenue={revenue}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <TodaysAppointments appointments={todaysList} />

                <AnalyticsChart data={monthlyRevenue} />
            </div>
        </div>
    );
}
