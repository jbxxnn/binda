'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DateTime } from 'luxon';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface Appointment {
    id: string;
    start_time: string;
    status: string;
    customer: { name: string; email?: string } | null;
    service: { name: string; price: number } | null;
    staff: { name: string } | null;
}

interface Props {
    appointments: Appointment[];
}

export default function TodaysAppointments({ appointments }: Props) {
    if (appointments.length === 0) {
        return (
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Today's Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">No appointments scheduled for today.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Today's Schedule</CardTitle>
                <Link href="/dashboard/appointments">
                    <Button variant="ghost" size="sm">
                        View All <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {appointments.map((appt) => {
                        const time = DateTime.fromISO(appt.start_time).toLocaleString(DateTime.TIME_SIMPLE);

                        return (
                            <div key={appt.id} className="flex items-center">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback>{appt.customer?.name.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">{appt.customer?.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {appt.service?.name} with {appt.staff?.name}
                                    </p>
                                </div>
                                <div className="ml-auto font-medium text-sm">
                                    {time}
                                </div>
                                <div className={`ml-4 text-xs px-2 py-1 rounded capitalize ${appt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                    appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                    {appt.status}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
