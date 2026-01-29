'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface ServiceFormProps {
    initialData?: {
        name: string;
        description: string;
        duration_minutes: number;
        price: number;
        buffer_before_minutes: number;
        buffer_after_minutes: number;
        deposit_type: string;
        deposit_value: number;
        is_active: boolean;
    };
    onSubmit: (data: any) => Promise<void>;
    loading: boolean;
    error: string | null;
    title?: string;
    showTitle?: boolean;
}

export default function ServiceForm({
    initialData,
    onSubmit,
    loading,
    error,
    title = 'Service Details',
    showTitle = true
}: ServiceFormProps) {
    const [formData, setFormData] = useState(initialData || {
        name: '',
        description: '',
        duration_minutes: 30,
        price: 0,
        buffer_before_minutes: 0,
        buffer_after_minutes: 0,
        deposit_type: 'none',
        deposit_value: 0,
        is_active: true,
    });

    const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);
    const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
    const [staffLoading, setStaffLoading] = useState(false);

    // Fetch staff list - effect runs once on mount
    useState(() => {
        const fetchStaff = async () => {
            setStaffLoading(true);
            try {
                const response = await fetch('/api/staff');
                if (response.ok) {
                    const data = await response.json();
                    setStaffList(data);
                }
            } catch (err) {
                console.error('Failed to load staff:', err);
            } finally {
                setStaffLoading(false);
            }
        };
        fetchStaff();
    });

    // If in edit mode (initialData exists), fetch CURRENTLY assigned staff
    useState(() => {
        if (initialData && (initialData as any).id) {
            const fetchAssigned = async () => {
                try {
                    const response = await fetch(`/api/services/${(initialData as any).id}/staff`);
                    if (response.ok) {
                        const data = await response.json();
                        // The API returns staff objects, we need IDs
                        setAssignedStaffIds(data.map((s: any) => s.id));
                    }
                } catch (err) {
                    console.error('Failed to load assigned staff:', err);
                }
            };
            fetchAssigned();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Include assignedStaffIds in the submission
        onSubmit({ ...formData, assignedStaffIds });
    };

    return (
        <Card className={!showTitle ? 'border-0 shadow-none p-4 py-8' : ''}>
            {showTitle && <CardHeader><CardTitle>{title}</CardTitle></CardHeader>}
            <CardContent className={!showTitle ? 'p-0' : ''}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Service Name</Label>
                        <Input
                            id="name"
                            required
                            className='border border-2 text-sm'
                            style={{ borderRadius: '0.3rem', height: '50px' }}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Haircut"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            className='border border-2 text-sm'
                            style={{ borderRadius: '0.3rem', height: '100px' }}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Service details..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="duration">Duration (minutes)</Label>
                            <Input
                                id="duration"
                                type="number"
                                required
                                min="5"
                                step="5"
                                className='border border-2 text-sm'
                                style={{ borderRadius: '0.3rem', height: '50px' }}
                                value={formData.duration_minutes}
                                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="price">Price (₦)</Label>
                            <Input
                                id="price"
                                type="number"
                                required
                                min="0"
                                className='border border-2 text-sm'
                                style={{ borderRadius: '0.3rem', height: '50px' }}
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="buffer_before">Buffer Before (minutes)</Label>
                            <Input
                                id="buffer_before"
                                type="number"
                                min="0"
                                step="5"
                                className='border border-2 text-sm'
                                style={{ borderRadius: '0.3rem', height: '50px' }}
                                value={formData.buffer_before_minutes}
                                onChange={(e) => setFormData({ ...formData, buffer_before_minutes: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="buffer_after">Buffer After (minutes)</Label>
                            <Input
                                id="buffer_after"
                                type="number"
                                min="0"
                                step="5"
                                className='border border-2 text-sm'
                                style={{ borderRadius: '0.3rem', height: '50px' }}
                                value={formData.buffer_after_minutes}
                                onChange={(e) => setFormData({ ...formData, buffer_after_minutes: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="deposit_type">Deposit Type</Label>
                        <select
                            id="deposit_type"
                            className="flex h-10 w-full border border-2 text-sm ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 "
                            style={{ borderRadius: '0.3rem', height: '50px' }}
                            value={formData.deposit_type}
                            onChange={(e) => setFormData({ ...formData, deposit_type: e.target.value })}
                        >
                            <option value="none">None</option>
                            <option value="fixed">Fixed Amount</option>
                            <option value="percentage">Percentage</option>
                        </select>
                    </div>

                    {formData.deposit_type !== 'none' && (
                        <div className="grid gap-2">
                            <Label htmlFor="deposit_value">
                                Deposit Value {formData.deposit_type === 'percentage' ? '(%)' : '(₦)'}
                            </Label>
                            <Input
                                id="deposit_value"
                                type="number"
                                required
                                min="0"
                                className='border border-2 text-sm'
                                style={{ borderRadius: '0.3rem', height: '50px' }}
                                value={formData.deposit_value}
                                onChange={(e) => setFormData({ ...formData, deposit_value: parseFloat(e.target.value) })}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>Assign Staff</Label>
                        <div className="border rounded-md p-4 space-y-2 max-h-60 overflow-y-auto" style={{ borderRadius: '0.5rem' }}>
                            {staffLoading ? (
                                <div className="text-sm text-muted-foreground">Loading staff...</div>
                            ) : staffList.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No staff members found.</div>
                            ) : (
                                staffList.map((staff) => (
                                    <div key={staff.id} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`staff-${staff.id}`}
                                            checked={assignedStaffIds.includes(staff.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setAssignedStaffIds([...assignedStaffIds, staff.id]);
                                                } else {
                                                    setAssignedStaffIds(assignedStaffIds.filter(id => id !== staff.id));
                                                }
                                            }}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <label
                                            htmlFor={`staff-${staff.id}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {staff.name}
                                        </label>
                                    </div>
                                ))
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Select staff members who can perform this service.
                        </p>
                    </div>

                    <Button type="submit" className="bg-primary-foreground text-primary hover:bg-primary-foreground hover:text-primary rounded-full" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Service'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
