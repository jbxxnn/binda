'use client';

import { useState, useEffect, use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import TimeOffManager from '@/components/staff/time-off-manager';

const DAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

interface WorkingHour {
    day_of_week: number;
    start_time: string;
    end_time: string;
}

interface DaySchedule {
    isOpen: boolean;
    start: string;
    end: string;
}

export default function StaffSchedulePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    // Unwrap params using React.use()
    const { id } = use(params);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [staffName, setStaffName] = useState('');

    // State for 7 days
    const [schedule, setSchedule] = useState<DaySchedule[]>(
        Array(7).fill({ isOpen: false, start: '09:00', end: '17:00' })
    );

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            // Load staff details
            const staffRes = await fetch(`/api/staff/${id}`);
            if (!staffRes.ok) throw new Error('Failed to load staff');
            const staff = await staffRes.json();
            setStaffName(staff.name);

            // Load working hours
            const hoursRes = await fetch(`/api/staff/${id}/working-hours`);
            if (!hoursRes.ok) throw new Error('Failed to load schedule');
            const hours: WorkingHour[] = await hoursRes.json();

            // Transform to local state
            const newSchedule = Array(7).fill(null).map((_, index) => {
                const dayHours = hours.find(h => h.day_of_week === index);
                if (dayHours) {
                    return {
                        isOpen: true,
                        // Format time HH:MM (remove seconds if present)
                        start: dayHours.start_time.slice(0, 5),
                        end: dayHours.end_time.slice(0, 5),
                    };
                }
                return { isOpen: false, start: '09:00', end: '17:00' };
            });

            setSchedule(newSchedule);
        } catch (err) {
            console.error(err);
            setError('Failed to load schedule data');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        setError(null);

        try {
            // Transform back to API format
            const hoursToSave = schedule
                .map((day, index) => {
                    if (!day.isOpen) return null;
                    return {
                        day_of_week: index,
                        start_time: day.start,
                        end_time: day.end,
                    };
                })
                .filter(Boolean);

            const response = await fetch(`/api/staff/${id}/working-hours`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hours: hoursToSave }),
            });

            if (!response.ok) throw new Error('Failed to save schedule');

            router.push('/dashboard/staff');
        } catch (err) {
            console.error(err);
            setError('Failed to save schedule');
        } finally {
            setSaving(false);
        }
    }

    const updateDay = (index: number, field: keyof DaySchedule, value: any) => {
        const newSchedule = [...schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setSchedule(newSchedule);
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" disabled>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-1" />
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                </div>

                <Card>
                    <CardHeader>
                        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="h-4 w-72 bg-gray-200 rounded animate-pulse" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {Array(7).fill(0).map((_, index) => (
                            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-4 w-48">
                                    <div className="h-6 w-10 bg-gray-200 rounded-full animate-pulse" />
                                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 py-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/staff">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold">Edit Schedule</h1>
                        <p className="text-sm text-gray-500">for {staffName}</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="text-sm bg-primary-foreground text-primary hover:bg-primary-foreground hover:text-primary rounded-full">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                    {error}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Weekly Working Hours</CardTitle>
                    <CardDescription>Configure regular working hours for this staff member.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {DAYS.map((dayName, index) => (
                        <div key={dayName} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors" style={{ borderRadius: "1rem" }}>
                            <div className="flex items-center gap-4 w-48">
                                <Switch
                                    checked={schedule[index].isOpen}
                                    className='data-[state=checked]:bg-primary-foreground'
                                    onCheckedChange={(checked) => updateDay(index, 'isOpen', checked)}
                                    id={`switch-${index}`}
                                />
                                <Label htmlFor={`switch-${index}`} className={`font-medium cursor-pointer ${schedule[index].isOpen ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {dayName}
                                </Label>
                            </div>

                            {schedule[index].isOpen ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="time"
                                        className="w-32"
                                        style={{ borderRadius: "1rem" }}
                                        value={schedule[index].start}
                                        onChange={(e) => updateDay(index, 'start', e.target.value)}
                                    />
                                    <span className="text-slate-400">to</span>
                                    <Input
                                        type="time"
                                        className="w-32"
                                        style={{ borderRadius: "1rem" }}
                                        value={schedule[index].end}
                                        onChange={(e) => updateDay(index, 'end', e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 text-center text-slate-400 text-sm">
                                    Closed
                                </div>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            <TimeOffManager staffId={id} />
        </div>
    );
}
