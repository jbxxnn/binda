'use client';

import { useState, useCallback, useEffect } from 'react';
import { Calendar, luxonLocalizer, Views, View } from 'react-big-calendar';
import { DateTime } from 'luxon';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Setup localizer
const localizer = luxonLocalizer(DateTime);

interface Props {
    staffList: { id: string; name: string }[];
}

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource?: any;
    status: string;
}

export default function CalendarView({ staffList }: Props) {
    const router = useRouter();
    const [view, setView] = useState<View>(Views.WEEK);
    const [date, setDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [staffFilter, setStaffFilter] = useState<string>('all');
    const [loading, setLoading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchEvents = useCallback(async (currentDate: Date, currentView: View) => {
        setLoading(true);
        // Calculate range based on view
        const dt = DateTime.fromJSDate(currentDate);
        let startIso, endIso;

        if (currentView === Views.MONTH) {
            startIso = dt.startOf('month').minus({ days: 7 }).toUTC().toISO(); // Buffer
            endIso = dt.endOf('month').plus({ days: 7 }).toUTC().toISO();
        } else if (currentView === Views.WEEK) {
            startIso = dt.startOf('week').minus({ days: 1 }).toUTC().toISO();
            endIso = dt.endOf('week').plus({ days: 1 }).toUTC().toISO();
        } else {
            startIso = dt.startOf('day').toUTC().toISO();
            endIso = dt.endOf('day').toUTC().toISO();
        }

        try {
            const res = await fetch(`/api/appointments/list?from=${startIso}&to=${endIso}&staffId=${staffFilter}`);
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();

            const mappedEvents = data.map((appt: any) => ({
                id: appt.id,
                title: `${appt.customer?.name || 'Unknown'} - ${appt.service?.name || 'Service'}`,
                start: new Date(appt.start_time),
                end: new Date(appt.end_time),
                status: appt.status,
                resource: appt
            }));

            setEvents(mappedEvents);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [staffFilter]);

    useEffect(() => {
        fetchEvents(date, view);
    }, [date, view, staffFilter, fetchEvents]);

    const handleNavigate = (newDate: Date) => {
        setDate(newDate);
    };

    const handleViewChange = (newView: View) => {
        setView(newView);
    };

    const eventStyleGetter = (event: CalendarEvent) => {
        let backgroundColor = '#3b82f6'; // blue
        if (event.status === 'cancelled') backgroundColor = '#ef4444'; // red
        if (event.status === 'completed') backgroundColor = '#10b981'; // green

        // Use service color if available and not cancelled
        // event.resource.service?.color

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    return (
        <div className="h-full flex flex-col p-4">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Select value={staffFilter} onValueChange={setStaffFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Staff" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Staff</SelectItem>
                            {staffList.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                </div>
            </div>

            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }} // Flex container parent needs defined height
                view={view}
                onView={handleViewChange}
                date={date}
                onNavigate={handleNavigate}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={handleSelectEvent}
                min={new Date(0, 0, 0, 8, 0, 0)} // Start at 8 AM display
                max={new Date(0, 0, 0, 20, 0, 0)} // End at 8 PM display
            />

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Appointment Details</DialogTitle>
                    </DialogHeader>
                    {selectedEvent && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="font-semibold text-gray-500">Service</p>
                                    <p>{selectedEvent.resource.service?.name}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-500">Customer</p>
                                    <p>{selectedEvent.resource.customer?.name}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-500">Start Time</p>
                                    <p>{DateTime.fromJSDate(selectedEvent.start).toLocaleString(DateTime.DATETIME_SHORT)}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-500">End Time</p>
                                    <p>{DateTime.fromJSDate(selectedEvent.end).toLocaleString(DateTime.DATETIME_SHORT)}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-500">Staff</p>
                                    <p>{selectedEvent.resource.staff?.name}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-500">Status</p>
                                    <p className="capitalize">{selectedEvent.status.replace('_', ' ')}</p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button onClick={() => router.push(`/dashboard/appointments/${selectedEvent.id}`)}>
                                    View Full Details / Edit
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
