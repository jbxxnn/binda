'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Staff {
    id: string;
    name: string;
}

interface Props {
    serviceId: string;
    onSelect: (staff: { id: string | null; name: string }) => void;
    // onBack: () => void; // No longer needed if in same view
    value?: string | null;
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StepStaff({ serviceId, onSelect, value }: Props) {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!serviceId) {
            setStaffList([]);
            return;
        }

        setLoading(true);
        // Fetch eligible staff via public API
        fetch(`/api/public/staff?serviceId=${serviceId}`)
            .then(res => res.json())
            .then(data => {
                setStaffList(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => setLoading(false));
    }, [serviceId]);

    const handleValueChange = (val: string) => {
        if (val === 'any') {
            onSelect({ id: null, name: 'Any Professional' });
        } else {
            const staff = staffList.find(s => s.id === val);
            if (staff) {
                onSelect({ id: staff.id, name: staff.name });
            }
        }
    };

    const currentValue = value === null ? 'any' : (value || '');

    if (loading) {
        return (
            <div className="space-y-2">
                <div>
                    {/* <h2 className="text-md font-regular text-slate-800">Select Professional</h2> */}
                </div>
                <div className="h-[90px] w-full bg-primary animate-pulse border border-primary rounded-md" style={{ height: '50px', borderRadius: '0.3rem' }} />
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div>
                {/* <h2 className="text-md font-regular text-slate-800">Select Professional</h2> */}
                {/* <p className="text-sm text-slate-500">Choose who you'd like to book with</p> */}
            </div>

            <Select
                value={currentValue}
                onValueChange={handleValueChange}
                disabled={!serviceId}
            >
                <SelectTrigger className="w-full h-[50px] border border-2 border-gray-300 rounded-sm text-primary-foreground ring-0 ring-offset-0 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0" style={{ height: '55px', borderRadius: '0.5rem' }}>
                    <SelectValue placeholder={!serviceId ? "Select a service first" : "Select professional..."} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="any">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                                <User className="h-3 w-3 text-slate-500" />
                            </div>
                            <span>Any Professional</span>
                        </div>
                    </SelectItem>
                    {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                            <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[10px]">{staff.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{staff.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
