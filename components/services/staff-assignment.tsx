'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { X, Plus, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner"

interface Staff {
    id: string;
    name: string;
}

export default function StaffAssignment({ serviceId }: { serviceId: string }) {
    const [assignedStaff, setAssignedStaff] = useState<Staff[]>([]);
    const [allStaff, setAllStaff] = useState<Staff[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [loading, setLoading] = useState(true);


    const fetchData = async () => {
        setLoading(true);
        try {
            const [assignedRes, allRes] = await Promise.all([
                fetch(`/api/services/${serviceId}/staff`),
                fetch('/api/staff')
            ]);

            const assignedData = await assignedRes.json();
            const allData = await allRes.json();

            setAssignedStaff(Array.isArray(assignedData) ? assignedData : []);
            setAllStaff(Array.isArray(allData) ? allData : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [serviceId]);

    const handleAdd = async () => {
        if (!selectedStaffId) return;

        try {
            const res = await fetch(`/api/services/${serviceId}/staff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staffId: selectedStaffId })
            });

            if (res.ok) {
                toast.success("Staff assigned successfully")
                fetchData();
                setSelectedStaffId('');
            } else {
                toast.error("Failed to assign staff")
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong")
        }
    };

    const handleRemove = async (staffId: string) => {
        try {
            const res = await fetch(`/api/services/${serviceId}/staff?staffId=${staffId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                // Optimistic update
                setAssignedStaff(prev => prev.filter(s => s.id !== staffId));
                toast.success("Staff removed successfully")
            } else {
                toast.error("Failed to remove staff")
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong")
        }
    };

    // Filter available staff (exclude already assigned)
    const availableStaff = allStaff.filter(
        s => !assignedStaff.find(assigned => assigned.id === s.id)
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Assigned Staff</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select staff to assign" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableStaff.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                            {availableStaff.length === 0 && (
                                <SelectItem value="none" disabled>No more staff available</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAdd} disabled={!selectedStaffId || selectedStaffId === 'none'}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-2">
                        {assignedStaff.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No staff assigned to this service yet.</p>
                        ) : (
                            assignedStaff.map(staff => (
                                <div key={staff.id} className="flex items-center justify-between p-2 border rounded bg-slate-50">
                                    <span className="font-medium">{staff.name}</span>
                                    <Button variant="ghost" size="sm" onClick={() => handleRemove(staff.id)}>
                                        <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
