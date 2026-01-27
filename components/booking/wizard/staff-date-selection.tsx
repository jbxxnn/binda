'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar'; // Ensure you have this shadcn component
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Staff {
    id: string;
    name: string;
}

interface Props {
    serviceId: string;
    date: Date | null;
    staffId: string | null;
    onSelect: (data: { date: Date; staffId: string | null; staffName: string | null }) => void;
}

export default function StaffDateSelection({ serviceId, date, staffId, onSelect }: Props) {
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(date || undefined);
    const [selectedStaff, setSelectedStaff] = useState<string | null>(staffId);

    // Fetch staff for this service (Only eligible staff)
    useEffect(() => {
        if (!serviceId) return;

        setLoadingStaff(true);
        // Fetch only staff assigned to this service
        fetch(`/api/services/${serviceId}/staff`)
            .then(res => res.json())
            .then(data => {
                // If no staff assigned, maybe allow all (fallback)? 
                // Strict requirement: "only staff who can offer services".
                // So if empty, user can't book? Or show warning?
                // For now, listing empty is correct behavior if strict.
                setStaff(Array.isArray(data) ? data : []);
                setLoadingStaff(false);
            })
            .catch(err => {
                console.error(err);
                setLoadingStaff(false);
            });
    }, [serviceId]);

    const handleContinue = () => {
        if (!selectedDate) return;

        const staffName = selectedStaff ? staff.find(s => s.id === selectedStaff)?.name || null : 'Any Staff';

        onSelect({
            date: selectedDate,
            staffId: selectedStaff || null, // Null means "Any"
            staffName: staffName
        });
    };

    return (
        <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h3 className="font-medium text-sm text-gray-500 uppercase tracking-wider">Select Date</h3>
                <div className="border rounded-lg p-4 flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="rounded-md"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-medium text-sm text-gray-500 uppercase tracking-wider">Select Staff (Optional)</h3>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                    <div
                        onClick={() => setSelectedStaff(null)}
                        className={`
                            flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                            ${selectedStaff === null ? 'border-primary bg-slate-50 ring-1 ring-primary' : 'hover:bg-slate-50'}
                        `}
                    >
                        <Avatar className="h-10 w-10">
                            <AvatarFallback>ANY</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium">Any Available Staff</p>
                            <p className="text-xs text-gray-500">Maximum availability</p>
                        </div>
                    </div>

                    {loadingStaff && <p className="text-sm text-gray-500 p-2">Loading staff...</p>}

                    {staff.map(member => (
                        <div
                            key={member.id}
                            onClick={() => setSelectedStaff(member.id)}
                            className={`
                                flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                                ${selectedStaff === member.id ? 'border-primary bg-slate-50 ring-1 ring-primary' : 'hover:bg-slate-50'}
                            `}
                        >
                            <Avatar className="h-10 w-10">
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium">{member.name}</p>
                        </div>
                    ))}
                </div>

                <div className="pt-4">
                    <Button
                        className="w-full"
                        disabled={!selectedDate}
                        onClick={handleContinue}
                    >
                        Select Date & Continue
                    </Button>
                </div>
            </div>
        </div>
    );
}
