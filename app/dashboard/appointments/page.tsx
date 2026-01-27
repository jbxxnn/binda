import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DateTime } from 'luxon';
import AppointmentFilters from '@/components/appointments/appointment-filters';
import AppointmentActions from '@/components/appointments/appointment-actions';

export default async function AppointmentsPage({
    searchParams,
}: {
    searchParams?: Promise<{
        query?: string;
        page?: string;
        status?: string;
    }>;
}) {
    const params = await searchParams;
    const query = params?.query || '';
    const status = params?.status || 'all';
    const currentPage = Number(params?.page) || 1;
    const itemsPerPage = 10;
    const offset = (currentPage - 1) * itemsPerPage;

    const supabase = await createClient();

    // Base Query
    let supabaseQuery = supabase
        .from('appointments')
        .select(`
            id, start_time, end_time, status, deposit_paid,
            customer:customers!inner(name, phone, email),
            service:services(name, price),
            staff:staff(name)
        `, { count: 'exact' });

    // Apply specific filters
    if (status !== 'all') {
        supabaseQuery = supabaseQuery.eq('status', status);
    }

    // Apply Search (Filter by Customer Name)
    if (query) {
        supabaseQuery = supabaseQuery.ilike('customers.name', `%${query}%`);
    }

    // Pagination
    supabaseQuery = supabaseQuery
        .order('start_time', { ascending: false })
        .range(offset, offset + itemsPerPage - 1);

    const { data: appointments, error, count } = await supabaseQuery;

    if (error) {
        console.error('Error fetching appointments:', error);
    }

    const list = appointments || [];
    const totalPages = count ? Math.ceil(count / itemsPerPage) : 0;

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Appointments</h1>
                <Link href="/dashboard/appointments/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> New Booking
                    </Button>
                </Link>
            </div>

            <div className="flex items-center justify-between gap-4">
                <AppointmentFilters />
            </div>

            <div className="rounded-md border bg-white">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Date & Time</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Customer</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Service</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Staff</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {list.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                        No appointments found.
                                    </td>
                                </tr>
                            ) : (
                                list.map((appt: any) => (
                                    <tr key={appt.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <td className="p-4 align-middle">
                                            <div className="font-medium">
                                                {DateTime.fromISO(appt.start_time).toLocaleString(DateTime.DATE_SHORT)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {DateTime.fromISO(appt.start_time).toLocaleString(DateTime.TIME_SIMPLE)}
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="font-medium">{Array.isArray(appt.customer) ? appt.customer[0]?.name : appt.customer?.name}</div>
                                            <div className="text-xs text-gray-500">{Array.isArray(appt.customer) ? appt.customer[0]?.phone : appt.customer?.phone}</div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            {Array.isArray(appt.service) ? appt.service[0]?.name : appt.service?.name}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {Array.isArray(appt.staff) ? appt.staff[0]?.name : appt.staff?.name}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize
                                                ${appt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                    appt.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                        appt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'}`}>
                                                {appt.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <AppointmentActions id={appt.id} currentStatus={appt.status} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
                <div>
                    Showing {list.length} of {count}
                </div>
                <div className="flex gap-2">
                    {currentPage > 1 && (
                        <Link href={`?page=${currentPage - 1}&status=${status}&query=${query}`}>
                            <Button variant="outline" size="sm">Previous</Button>
                        </Link>
                    )}
                    {currentPage < totalPages && (
                        <Link href={`?page=${currentPage + 1}&status=${status}&query=${query}`}>
                            <Button variant="outline" size="sm">Next</Button>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
