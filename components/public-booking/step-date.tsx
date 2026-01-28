'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar'; // Reusing shadcn, might need mobile tweak
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { DateTime } from 'luxon';

interface Props {
    serviceId: string;
    staffId: string | null;
    tenantId: string;
    timezone: string;
    onSelect: (data: { date: Date; slot: string }) => void;
    onBack: () => void;
}

export default function StepDate({ serviceId, staffId, timezone, onSelect, onBack }: Props) {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [slots, setSlots] = useState<{ start: string; available: boolean }[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    useEffect(() => {
        if (!date) return;

        setLoadingSlots(true);
        const dateStr = DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');

        let url = `/api/slots?date=${dateStr}&serviceId=${serviceId}`;
        if (staffId) url += `&staffId=${staffId}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                setSlots(Array.isArray(data) ? data : []);
                setLoadingSlots(false);
            })
            .catch(err => {
                console.error(err);
                setLoadingSlots(false);
            });
    }, [date, serviceId, staffId]);

    const handleSlotClick = (isoString: string) => {
        if (!date) return;
        onSelect({ date, slot: isoString });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="-ml-3 rounded-full hover:bg-secondary hover:text-primary-foreground transition-all" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-sm font-semibold text-slate-800">Change Service or Staff</h2>
            </div>

            <div className="flex flex-col gap-8">
                {/* Custom styled calendar wrapper */}
                <div className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                </div>

                <div className="flex-1">
                    <h3 className="font-bold text-sm text-primary-foreground mb-3">
                        Available Slots for {date ? DateTime.fromJSDate(date).toLocaleString(DateTime.DATE_MED) : 'Selected Date'}
                    </h3>

                    {loadingSlots ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-300" /></div>
                    ) : slots.length === 0 ? (
                        <div className="text-center p-8 border border-dashed rounded-lg text-slate-400">
                            No availability for this date.
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {slots.map((slot) => {
                                const time = DateTime.fromISO(slot.start).toLocaleString(DateTime.TIME_SIMPLE);
                                return (
                                    <button
                                        key={slot.start}
                                        disabled={!slot.available}
                                        onClick={() => handleSlotClick(slot.start)}
                                        className={`
                                            py-2 px-1 text-xs bg-white shadow-md rounded border border-2 border-gray-200 transition-all
                                            ${!slot.available
                                                ? 'bg-primary-foreground text-white border-transparent cursor-not-allowed'
                                                : 'hover:border-gray-400 border-border-400 text-slate-700 active:bg-primary-foreground active:text-white'}
                                        `}
                                    >
                                        {time}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
