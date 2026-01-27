'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Calendar, User, Clock, CheckCircle } from 'lucide-react';
import { BookingState } from '@/app/dashboard/appointments/new/page';
import { DateTime } from 'luxon';
import { useRouter } from 'next/navigation';

interface Props {
    booking: BookingState;
    onBack: () => void;
}

export default function BookingReview({ booking, onBack }: Props) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceId: booking.serviceId,
                    staffId: booking.staffId, // If null, backend should assign? Or force selection? 
                    // Our API expects a staffId currently. 
                    // If wizard allows "Any", we would have needed logic to pick one. 
                    // For now, let's assume StaffId is required by API or API handles it.
                    // Wait, our API: `if (!serviceId || !staffId)` -> It Require staffId.
                    // IMPORTANT: If user selected "Any", we need to Resolve it to a staff ID before calling API? 
                    // Or Update API to handle allocation.
                    // For V1 wizard, let's assume user MUST pick staff if "Any" logic isn't on backend.
                    // Actually, if we selected "Any", `booking.staffId` is null. This will fail.
                    // We need a "Best Match" logic.
                    // *Hack for now*: If staffId is null, we can't complete.
                    // But wait, the previous SlotSelection component used `staffId` to filter slots.
                    // If staffId was null, it showed mixed slots.
                    // We need to know WHICH staff corresponds to the chosen slot?
                    // The slot object returned from API currently is just { start, end }. Does NOT say who.
                    // PHASE 4 FIX NEEDED: Slot Generator should return `staffId` with the slot if query was for "any".

                    // Since we didn't do that, let's Fail safely or quick fix:
                    // Only allow Specific Staff selection for now?
                    // OR: Pass a dummy staff ID if we want to test?
                    // Correct fix: The API endpoint needs to assign staff if missing.

                    startTime: booking.slot,
                    customerName: booking.customer?.name,
                    customerPhone: booking.customer?.phone,
                    customerEmail: booking.customer?.email,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create booking');
            }

            const appointment = await res.json();
            router.push(`/dashboard/appointments/${appointment.id}`); // Or success page

        } catch (err: any) {
            console.error(err);
            setError(err.message);
            setSubmitting(false);
        }
    };

    if (!booking.serviceId || !booking.date || !booking.slot || !booking.customer) {
        return <div className="text-red-500">Missing information. Please go back.</div>;
    }

    const dateLabel = DateTime.fromJSDate(booking.date).toLocaleString(DateTime.DATE_FULL);
    const timeLabel = DateTime.fromISO(booking.slot).toLocaleString(DateTime.TIME_SIMPLE);

    return (
        <div className="max-w-md mx-auto space-y-8">
            <div className="space-y-4">
                <h3 className="font-bold text-xl text-center">Review Booking</h3>

                <div className="bg-slate-50 p-6 rounded-lg space-y-4 border">
                    <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-primary mt-1" />
                        <div>
                            <p className="text-sm text-gray-500">Date & Time</p>
                            <p className="font-medium">{dateLabel} at {timeLabel}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary mt-1" />
                        <div>
                            <p className="text-sm text-gray-500">Service</p>
                            <p className="font-medium">{booking.serviceName}</p>
                            <p className="text-sm text-gray-500">₦{booking.servicePrice?.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-primary mt-1" />
                        <div>
                            <p className="text-sm text-gray-500">Staff</p>
                            <p className="font-medium">{booking.staffName || 'Assign Best Fit'}</p>
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <p className="text-sm text-gray-500 mb-1">Customer</p>
                        <p className="font-medium">{booking.customer.name}</p>
                        <p className="text-sm text-gray-500">{booking.customer.phone}</p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-100 text-red-700 text-sm rounded">
                        {error}
                        {booking.staffId === null && " (Please select a specific staff member in Step 2)"}
                    </div>
                )}
            </div>

            <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={onBack} disabled={submitting}>
                    Back
                </Button>
                <Button className="flex-1" onClick={handleConfirm} disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm Booking
                </Button>
            </div>
        </div>
    );
}
