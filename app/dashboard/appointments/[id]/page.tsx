'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, User, Clock, MapPin, CreditCard } from 'lucide-react';
import { DateTime } from 'luxon';
import Link from 'next/link';

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/appointments/${id}`)
            .then(res => res.json())
            .then(data => {
                setAppointment(data);
                setLoading(false);
            })
            .catch(err => setLoading(false));
    }, [id]);

    if (loading) return <div className="p-8">Loading...</div>;
    if (!appointment || appointment.error) return <div className="p-8">Appointment not found</div>;

    const date = DateTime.fromISO(appointment.start_time).toLocaleString(DateTime.DATE_FULL);
    const time = DateTime.fromISO(appointment.start_time).toLocaleString(DateTime.TIME_SIMPLE);

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/appointments">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Appointment Details</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl text-primary">{appointment.service?.name}</CardTitle>
                                <p className="text-gray-500">{date} at {time}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm capitalize ${appointment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                    appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {appointment.status.replace('_', ' ')}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium">Customer</p>
                                <p className="text-gray-600">{appointment.customer?.name}</p>
                                <p className="text-xs text-gray-500">{appointment.customer?.phone}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium">Staff Member</p>
                                <p className="text-gray-600">{appointment.staff?.name}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium">Payment Status</p>
                                <p className="text-gray-600">
                                    {appointment.deposit_paid ? 'Deposit Paid' : 'No Deposit / Pending'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
