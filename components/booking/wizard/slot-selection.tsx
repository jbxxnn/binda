'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DateTime } from 'luxon';
import { Loader2, ArrowLeft } from 'lucide-react';

interface Props {
    serviceId: string;
    staffId: string | null;
    date: Date;
    selectedSlot: string | null;
    onSelect: (slot: string) => void;
    onBack: () => void;
}

interface Slot {
    start: string;
    end: string;
    available: boolean;
}

export default function SlotSelection({ serviceId, staffId, date, selectedSlot, onSelect, onBack }: Props) {
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        // Format date as YYYY-MM-DD
        const dateStr = DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');

        let url = `/api/slots?date=${dateStr}&serviceId=${serviceId}`;
        if (staffId) url += `&staffId=${staffId}`;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch slots');
                return res.json();
            })
            .then(data => {
                setSlots(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('Failed to load slots. Please try different options.');
                setLoading(false);
            });
    }, [date, serviceId, staffId]);

    // Group slots by Morning/Afternoon/Evening if many?
    // For now simple grid.

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <h3 className="font-medium text-lg">
                    {DateTime.fromJSDate(date).toLocaleString(DateTime.DATE_HUGE)}
                </h3>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-gray-500">Checking availability...</p>
                </div>
            ) : error ? (
                <div className="text-center p-8 bg-red-50 text-red-600 rounded-lg">
                    {error}
                </div>
            ) : slots.length === 0 ? (
                <div className="text-center p-12 border border-dashed rounded-lg bg-slate-50">
                    <p className="text-gray-500">No available slots for this date.</p>
                    <Button variant="link" onClick={onBack}>Try another date or staff</Button>
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {slots.map((slot) => {
                        const timeLabel = DateTime.fromISO(slot.start).toLocaleString(DateTime.TIME_SIMPLE);
                        return (
                            <Button
                                key={slot.start}
                                variant={selectedSlot === slot.start ? 'default' : 'outline'}
                                className={`h-12 ${!slot.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={!slot.available}
                                onClick={() => onSelect(slot.start)}
                            >
                                {timeLabel}
                            </Button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
