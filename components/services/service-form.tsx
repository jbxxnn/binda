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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Card className={!showTitle ? 'border-0 shadow-none' : ''}>
            {showTitle && <CardHeader><CardTitle>{title}</CardTitle></CardHeader>}
            <CardContent className={!showTitle ? 'p-0' : ''}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Service Name</Label>
                        <Input
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Haircut"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
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
                                value={formData.buffer_after_minutes}
                                onChange={(e) => setFormData({ ...formData, buffer_after_minutes: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="deposit_type">Deposit Type</Label>
                        <select
                            id="deposit_type"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Service'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
